<?php
/**
 * VIKUB — обработчик форм сайта vikub.com
 * Обслуживает обратную связь и регистрацию на семинар.
 * ТЗ «Обработчик форм vikub.com», версия 1.0.
 *
 * Правится в исходниках проекта: public/api/contact.php.
 * Правка прямо на сервере будет стёрта следующей сборкой.
 */

declare(strict_types=1);

// ---------------------------------------------------------------- настройки

const STORAGE_DIR    = '/home/m142090/vikub-forms';
/**
 * Основной получатель. Дополнительные адреса берутся из файла
 * <STORAGE_DIR>/recipients.txt — по одному в строке, # начинает комментарий.
 * Файл лежит вне репозитория: репозиторий публичный, личные адреса в нём не место,
 * и при этом список переживает пересборку сайта.
 */
const RECIPIENTS_BASE = ['info@vikub.com'];
const FROM_ADDRESS   = 'info@vikub.com';
const FROM_NAME      = 'VIKUB';
const SITE_ORIGIN    = 'https://vikub.com';

const EVENT_ID       = 'vikub-seminar-2026-10-01';
const REG_DEADLINE   = '2026-09-28T23:59:59+02:00'; // src/content/system/seminar.json
const REPORT_TIMEZONE = 'Europe/Rome';

const MAX_BODY_BYTES = 65536;   // 4.6

/**
 * Ограничение частоты (5.2). Считаются отдельно принятые заявки и все запросы.
 * Пороги намеренно мягкие: неверно заполненная форма вообще не приближает
 * посетителя к блокировке, а живой человек не упрётся в них при обычной работе.
 */
const RATE_ACCEPTED_SHORT = [5, 180];     // 5 принятых заявок за 3 минуты
const RATE_ACCEPTED_DAY   = [20, 86400];  // 20 принятых заявок за сутки
const RATE_REQUESTS_SHORT = [60, 600];    // потолок против перебора

const LOG_MAX_BYTES  = 5242880; // 7.5 — 5 МБ

const LOCALES = ['it', 'en', 'ru'];

/** Поля, попадающие в письмо и журнал. Всё остальное игнорируется (4.8). */
const FIELDS = [
    'contact_enquiry' => [
        'name'    => ['required' => true,  'max' => 120],
        'email'   => ['required' => true,  'max' => 254],
        'phone'   => ['required' => true,  'max' => 40],
        'company' => ['required' => true,  'max' => 200],
        'service' => ['required' => true,  'max' => 160],
        'message' => ['required' => true,  'max' => 5000],
    ],
    'seminar_registration' => [
        'first_name' => ['required' => true,  'max' => 120],
        'last_name'  => ['required' => true,  'max' => 120],
        'company'    => ['required' => true,  'max' => 200],
        'email'      => ['required' => true,  'max' => 254],
        'phone'      => ['required' => false, 'max' => 40],
    ],
];

const LABELS = [
    'name' => 'Имя', 'email' => 'Email', 'phone' => 'Телефон', 'message' => 'Сообщение',
    'service' => 'Чем мы можем помочь?',
    'first_name' => 'Имя', 'last_name' => 'Фамилия', 'company' => 'Компания',
];

/** Allowed contact topics match the localized site dropdowns. */
const CONTACT_TOPICS = [
    'it' => [
        'Ingresso nel mercato bielorusso',
        'Ingresso nel mercato russo / UEE',
        'Ricerca di partner commerciali',
        'Investimenti in Bielorussia / UEE',
        'Ricerca di un fornitore / produttore in Italia',
        'Ricerca di prodotti / attrezzature in Italia',
        'Valutazione delle prospettive del mio progetto',
        'Altro',
    ],
    'en' => [
        'Entering the Belarusian market',
        'Entering the Russian / EAEU market',
        'Finding trading partners',
        'Investments in Belarus / EAEU',
        'Finding a supplier / manufacturer in Italy',
        'Finding products / equipment in Italy',
        'Assessing the prospects of my project',
        'Other',
    ],
    'ru' => [
        'Выход на рынок Беларуси',
        'Выход на рынок России / ЕАЭС',
        'Поиск торговых партнёров',
        'Инвестиции в Беларуси / ЕАЭС',
        'Поиск поставщика / производителя в Италии',
        'Поиск товара / оборудования в Италии',
        'Оценка перспектив моего проекта',
        'Другое',
    ],
];

/** Строки страницы-ответа для режима без JavaScript (8.2). */
const PAGE_TEXT = [
    'it' => ['ok' => 'Grazie, il messaggio è stato inviato.', 'fail' => 'Non è stato possibile inviare il messaggio.', 'back' => 'Torna al sito'],
    'en' => ['ok' => 'Thank you, your message has been sent.', 'fail' => 'The message could not be sent.', 'back' => 'Back to the site'],
    'ru' => ['ok' => 'Спасибо, сообщение отправлено.', 'fail' => 'Отправить сообщение не удалось.', 'back' => 'Вернуться на сайт'],
];

// -------------------------------------------------------------- подготовка

ini_set('display_errors', '0');          // 10.2
ini_set('log_errors', '1');
error_reporting(E_ALL);

ensure_storage();
ini_set('error_log', STORAGE_DIR . '/php-errors.log');

$wantsJson = strpos((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false; // 8.1

set_exception_handler(static function (Throwable $e) use ($wantsJson): void {
    error_log('contact.php: ' . $e->getMessage());
    respond(500, false, 'internal error', $wantsJson, 'ru');
});

// CORS is needed when the static frontend is served by GitHub Pages.
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$allowedOrigins = [SITE_ORIGIN, 'https://mikita-hubanau.github.io'];
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Accept, Content-Type');
        http_response_code(204);
        exit;
    }
}

// ------------------------------------------------------------------ приём

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {                       // 2.x
    respond(405, false, 'method not allowed', $wantsJson, 'ru');
}

$declaredLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($declaredLength > MAX_BODY_BYTES) {                                    // 4.6
    respond(413, false, 'payload too large', $wantsJson, 'ru');
}

// Reject array-shaped inputs rather than converting them to the string 'Array'.
foreach ($_POST as $key => $value) {
    if (!is_string($value)) respond(422, false, 'invalid field type', $wantsJson, 'ru');
}

$formType = trim((string)($_POST['form_type'] ?? ''));
if (!isset(FIELDS[$formType])) {                                           // 4.1
    respond(400, false, 'unknown form type', $wantsJson, 'ru');
}

$language = trim((string)($_POST['language'] ?? ''));
if (!in_array($language, LOCALES, true)) {                                 // 4.5
    respond(422, false, 'unsupported language', $wantsJson, 'ru');
}

// Ограничение частоты — до разбора полей, чтобы перебор не нагружал сервер (5.2).
$rateFile = STORAGE_DIR . '/ratelimit/' . hash('sha256', client_ip()) . '.json'; // 10.5
$rate = rate_load($rateFile);

if (rate_count($rate['requests'], RATE_REQUESTS_SHORT[1]) >= RATE_REQUESTS_SHORT[0]
    || rate_count($rate['accepted'], RATE_ACCEPTED_SHORT[1]) >= RATE_ACCEPTED_SHORT[0]
    || rate_count($rate['accepted'], RATE_ACCEPTED_DAY[1]) >= RATE_ACCEPTED_DAY[0]) {
    respond(429, false, 'rate limited', $wantsJson, $language);
}

$rate['requests'][] = time();
rate_save($rateFile, $rate);

// Ловушка отвечает успехом, чтобы бот не подобрал обход (5.1).
if (trim((string)($_POST['_gotcha'] ?? '')) !== '') {
    $rate['accepted'][] = time();
    rate_save($rateFile, $rate);
    write_log($formType, $language, [], true, null);
    respond(200, true, null, $wantsJson, $language);
}

// -------------------------------------------------------------- валидация

$values = [];
foreach (FIELDS[$formType] as $field => $rule) {
    $raw = (string)($_POST[$field] ?? '');
    $raw = str_replace("\0", '', $raw);
    $value = trim($raw);

    if ($value === '') {
        if ($rule['required']) {                                           // 4.2
            respond(422, false, "missing field: $field", $wantsJson, $language);
        }
        $values[$field] = '';
        continue;
    }
    if (text_length($value) > $rule['max']) {                              // 4.2
        respond(422, false, "field too long: $field", $wantsJson, $language);
    }
    $values[$field] = $value;
}

if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {                // 4.3
    respond(422, false, 'invalid email', $wantsJson, $language);
}

if ($formType === 'contact_enquiry') {
    $digits = preg_replace('/\D/', '', $values['phone']);
    if (!preg_match('/^\+?[0-9\s().-]+$/D', $values['phone']) || strlen($digits) < 7 || strlen($digits) > 15) {
        respond(422, false, 'invalid phone', $wantsJson, $language);
    }
    if (!in_array($values['service'], CONTACT_TOPICS[$language], true)) {
        respond(422, false, 'invalid service', $wantsJson, $language);
    }
}

if (trim((string)($_POST['consent'] ?? '')) !== 'yes') {                   // 4.4
    respond(422, false, 'consent required', $wantsJson, $language);
}

// Значения, попадающие в почтовые заголовки, не должны нести перевод строки (6.4).
$headerBound = [$values['email']];
$headerBound[] = $formType === 'contact_enquiry'
    ? $values['name']
    : $values['first_name'] . ' ' . $values['last_name'];

foreach ($headerBound as $candidate) {
    if (preg_match('/[\r\n]/', $candidate) || preg_match('/%0[ad]/i', $candidate)) {
        respond(422, false, 'header injection attempt', $wantsJson, $language);
    }
}

if ($formType === 'seminar_registration') {
    if (trim((string)($_POST['event_id'] ?? '')) !== EVENT_ID) {           // раздел 3
        respond(422, false, 'unknown event', $wantsJson, $language);
    }
    if (time() > strtotime(REG_DEADLINE)) {                               // 4.7
        respond(422, false, 'registration closed', $wantsJson, $language);
    }
}

// ------------------------------------------------ журнал, затем письмо (7.1)

$sender = $formType === 'contact_enquiry'
    ? $values['name']
    : trim($values['first_name'] . ' ' . $values['last_name']);

$subject = $formType === 'contact_enquiry'                                 // 6.5
    ? 'VIKUB · Обращение с сайта · ' . text_cut($sender, 80)
    : 'VIKUB · Регистрация на семинар · ' . text_cut($sender, 80);

$rate['accepted'][] = time();
rate_save($rateFile, $rate);

$sent = send_mail($subject, build_body($formType, $language, $values), $sender, $values['email']);
write_log($formType, $language, $values, false, $sent);

// Заявка сохранена независимо от почты, поэтому посетителю отвечаем успехом (6.7).
respond(200, true, null, $wantsJson, $language);

// ------------------------------------------------------------------ утилиты

function ensure_storage(): void
{
    foreach ([STORAGE_DIR, STORAGE_DIR . '/ratelimit'] as $dir) {          // 1.3, 7.5
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
    }
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function text_cut(string $value, int $limit): string
{
    if (text_length($value) <= $limit) {
        return $value;
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
}

/** Только REMOTE_ADDR: заголовки прокси подделываются кем угодно (5.5). */
function client_ip(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/** Читает счётчики и попутно выбрасывает устаревшие отметки (5.3). */
function rate_load(string $file): array
{
    $now = time();
    $keep = max(RATE_ACCEPTED_DAY[1], RATE_REQUESTS_SHORT[1]);
    $state = ['requests' => [], 'accepted' => []];

    if (!is_file($file)) {
        return $state;
    }
    $decoded = json_decode((string)@file_get_contents($file), true);
    if (!is_array($decoded)) {
        return $state;
    }
    foreach (['requests', 'accepted'] as $bucket) {
        foreach ((array)($decoded[$bucket] ?? []) as $item) {
            if (is_int($item) && $now - $item < $keep) {
                $state[$bucket][] = $item;
            }
        }
    }
    return $state;
}

function rate_count(array $hits, int $window): int
{
    $now = time();
    $count = 0;
    foreach ($hits as $item) {
        if ($now - $item < $window) {
            $count++;
        }
    }
    return $count;
}

function rate_save(string $file, array $state): void
{
    @file_put_contents($file, json_encode($state), LOCK_EX);
    @chmod($file, 0600);
}

function build_body(string $formType, string $language, array $values): string
{
    $when = new DateTimeImmutable('now', new DateTimeZone(REPORT_TIMEZONE));

    $lines = [];
    $lines[] = $formType === 'contact_enquiry'
        ? 'Обращение через форму обратной связи на vikub.com'
        : 'Регистрация на семинар VIKUB 1 октября 2026';
    $lines[] = '';

    foreach ($values as $field => $value) {                                // 6.6
        if ($value === '') {
            continue;
        }
        $label = LABELS[$field] ?? $field;
        $lines[] = strpos($value, "\n") !== false
            ? $label . ':' . "\n" . $value
            : $label . ': ' . $value;
    }

    $lines[] = '';
    $lines[] = str_repeat('-', 48);
    $lines[] = 'Язык страницы: ' . $language;
    $lines[] = 'Время (' . REPORT_TIMEZONE . '): ' . $when->format('d.m.Y H:i');
    $lines[] = 'IP: ' . client_ip();
    $lines[] = 'Браузер: ' . text_cut(str_replace(["\r", "\n"], ' ', (string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 200);

    return implode("\n", $lines) . "\n";
}

function encode_header(string $value): string
{
    if (preg_match('/^[\x20-\x7E]*$/', $value)) {
        return $value;
    }
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function send_mail(string $subject, string $body, string $senderName, string $senderEmail): bool
{
    $replyName = encode_header(text_cut($senderName, 80));

    $headers = implode("\r\n", [
        'From: ' . encode_header(FROM_NAME) . ' <' . FROM_ADDRESS . '>',   // 6.1
        'Reply-To: ' . $replyName . ' <' . $senderEmail . '>',             // 6.2
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',                         // 6.6
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: vikub-forms',
    ]);

    $ok = true;
    foreach (recipients() as $to) {                                        // 6.3
        $result = @mail($to, encode_header($subject), $body, $headers, '-f' . FROM_ADDRESS);
        $ok = $ok && $result;
    }
    return $ok;
}

/** Список получателей: константа плюс необязательный файл на сервере (6.3). */
function recipients(): array
{
    $list = RECIPIENTS_BASE;
    $file = STORAGE_DIR . '/recipients.txt';
    if (is_file($file)) {
        foreach ((array)@file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            if (filter_var($line, FILTER_VALIDATE_EMAIL)) {
                $list[] = $line;
            }
        }
    }
    return array_values(array_unique($list));
}

function write_log(string $formType, string $language, array $values, bool $spam, $mailed)
{
    $file = STORAGE_DIR . '/submissions.jsonl';

    if (is_file($file) && filesize($file) > LOG_MAX_BYTES) {               // 7.5
        @rename($file, STORAGE_DIR . '/submissions-' . date('Y-m-d-His') . '.jsonl');
    }

    $record = [
        'at'        => date('c'),
        'form_type' => $formType,
        'language'  => $language,
        'spam'      => $spam,
        'mailed'    => $mailed,
        'ip'        => client_ip(),
        'ua'        => text_cut((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 300),
        'fields'    => $values,
    ];

    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return;
    }
    @file_put_contents($file, $line . "\n", FILE_APPEND | LOCK_EX);        // 7.4
    @chmod($file, 0600);                                                   // 7.5
}

/**
 * Единственный выход из скрипта.
 * JSON для запросов с Accept: application/json, иначе — страница (8.1).
 * Никаких редиректов: клиент отправляет запрос с redirect: 'error' (2.2).
 */
function respond(int $status, bool $ok, $error, bool $wantsJson, string $language)
{
    http_response_code($status);
    header_remove('X-Powered-By');

    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');           // 2.3
        $payload = ['ok' => $ok];
        if (!$ok && $error !== null) {
            $payload['error'] = $error;                                    // 2.4
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    $text = PAGE_TEXT[$language] ?? PAGE_TEXT['ru'];
    $headline = $ok ? $text['ok'] : $text['fail'];
    $safe = function ($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); };

    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="' . $safe($language) . '"><head><meta charset="utf-8">'
       . '<meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex">'
       . '<title>VIKUB</title>'
       . '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;'
       . 'font:16px/1.6 system-ui,sans-serif;color:#1A1A1A;background:#F6F3EC;padding:2rem}'
       . 'main{max-width:32rem;text-align:center}h1{font-size:1.4rem;font-weight:600;margin:0 0 1rem}'
       . 'a{color:#8B692B}</style></head><body><main><h1>' . $safe($headline) . '</h1>'
       . '<p><a href="' . SITE_ORIGIN . '/">' . $safe($text['back']) . '</a></p>'
       . '</main></body></html>';
    exit;
}
