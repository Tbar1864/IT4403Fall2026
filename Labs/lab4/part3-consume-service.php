<?php
// Server-side API consumption: requires PHP 7.4+ with cURL enabled.
function escape($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function requestJson(string $url): array {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('Enable the PHP cURL extension to run this lab.');
    }
    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_USERAGENT => 'IT4403-PHP-Lab/1.0'
    ]);
    $body = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $failed = ($body === false);
    curl_close($handle);
    if ($failed) {
        throw new RuntimeException('The API request failed. Check your connection and PHP HTTPS configuration.');
    }
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('The API returned HTTP status ' . $status . '. Please try again later.');
    }
    $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('The API did not return the expected JSON structure.');
    }
    // Google Maps reports service errors inside its JSON response.
    // Only check Google's status; other APIs use different response formats.
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    if ($host === 'maps.googleapis.com') {
        $apiStatus = $data['status'] ?? 'UNKNOWN';
        if ($apiStatus !== 'OK') {
            throw new RuntimeException(
                'Google Maps did not return location data. API status: ' .
                $apiStatus .
                '. This lab does not require configuring Google Maps; ' .
                'use the public API demonstration instead.'
            );
        }
    }
    return $data;
}
$user = null;
$weather = null;
$error = '';
$userUrl = '';
$weatherUrl = '';
$selected = 1;
if (isset($_GET['user_id'])) {
    $id = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1, 'max_range' => 10]]);
    if ($id === false || $id === null) {
        $error = 'Choose a user ID between 1 and 10.';
    } else {
        $selected = $id;
        try {
            $userUrl = 'https://jsonplaceholder.typicode.com/users/' . $id;
            $user = requestJson($userUrl);
            $lat = $user['address']['geo']['lat'] ?? null;
            $lon = $user['address']['geo']['lng'] ?? null;
            if (!is_numeric($lat) || !is_numeric($lon) ||
                abs((float) $lat) > 90 || abs((float) $lon) > 180) {
                throw new RuntimeException('The user response did not contain valid coordinates.');
            }
            $weatherUrl = 'https://api.open-meteo.com/v1/forecast?' . http_build_query([
                'latitude' => $lat,
                'longitude' => $lon,
                'current' => 'temperature_2m,relative_humidity_2m,wind_speed_10m',
                'timezone' => 'auto'
            ], '', '&', PHP_QUERY_RFC3986);
            $weather = requestJson($weatherUrl);
            if (!isset($weather['current']['temperature_2m'],
                       $weather['current']['relative_humidity_2m'],
                       $weather['current']['wind_speed_10m'])) {
                throw new RuntimeException('The weather response is missing current conditions.');
            }
        } catch (Throwable $exception) {
            $error = $exception->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lab 4: Consume a Service Using PHP | CCSE Information Technology</title>
    <style>
      :root {
        --black: #000;
        --gold: #f5b335;
        --bg: #f4f5f7;
        --text: #202124;
        --muted: #5f6368;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.6;
      }
      header {
        padding: 22px 6%;
        color: #fff;
        background: var(--black);
        border-bottom: 6px solid var(--gold);
      }
      .brand,
      main {
        max-width: 1100px;
        margin: 0 auto;
      }
      .brand p {
        margin: 0 0 5px;
        color: var(--gold);
        font-weight: bold;
      }
      .brand h1 {
        margin: 0;
        font-size: clamp(1.5rem, 4vw, 2.2rem);
      }
      nav {
        background: #222;
      }
      nav ul {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 1100px;
        margin: 0 auto;
        padding: 0;
        list-style: none;
      }
      nav a {
        display: block;
        padding: 14px 24px;
        color: #fff;
        font-weight: bold;
        text-decoration: none;
      }
      nav a:hover,
      nav a:focus,
      nav a[aria-current="page"] {
        color: #000;
        background: var(--gold);
        outline: none;
      }
      main {
        padding: 42px 6%;
      }
      h2 {
        margin-top: 0;
        font-size: 2rem;
      }
      .lead {
        color: var(--muted);
      }
      .notice {
        padding: 22px;
        background: #fff;
        border-left: 5px solid var(--gold);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
      }
      .lab-materials ul {
        margin: 0;
        padding-left: 22px;
      }
      .lab-materials li {
        margin: 12px 0;
      }
      .lab-materials a:not(.button) {
        color: #1a4f9c;
        font-weight: bold;
      }
      .lab-materials a:not(.button):hover,
      .lab-materials a:not(.button):focus {
        color: #000;
        background: var(--gold);
        outline: 2px solid #000;
        outline-offset: 2px;
      }
      .button {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 16px;
        color: #fff;
        background: var(--black);
        border-radius: 3px;
        font-weight: bold;
        text-decoration: none;
      }
      .button:hover,
      .button:focus {
        color: #000;
        background: var(--gold);
        outline: 2px solid #000;
        outline-offset: 2px;
      }
      footer {
        padding: 20px 6%;
        color: #fff;
        background: var(--black);
        text-align: center;
      }
      footer p {
        margin: 0;
      }
      @media (max-width: 520px) {
        nav ul {
          display: block;
        }
        nav a {
          text-align: center;
        }
      }
      pre { overflow-x: auto; padding: 16px; background: #f4f5f7; }
      code { overflow-wrap: anywhere; }
      select { padding: 10px; font: inherit; }
      button { cursor: pointer; font: inherit; border: 0; }
      dd { margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">
        <p>Kennesaw State University</p>
        <h1>CCSE Information Technology (IT) Website</h1>
      </div>
    </header>

    <nav aria-label="Main navigation">
      <ul>
        <li><a href="../../index.html">Home</a></li>
        <li><a href="../../exercises.html">Exercises</a></li>
        <li><a href="../../lab-work.html" aria-current="page">Lab Work</a></li>
        <li><a href="../../projects.html">Projects</a></li>
      </ul>
    </nav>

    <main>
      <h2>Lab 4: Consume a Service Using PHP</h2>
      <p class="lead">Part 3: Consume a Service Using PHP</p>
      <section class="notice lab-materials" aria-labelledby="overview">
        <h3 id="overview">Tutorial and learning goals</h3>
        <p>Follow the <a href="https://youtu.be/RTjd1nwvlj4?si=S4zZVZ1YoN9Guj6N">YouTube tutorial: Using REST APIs in a web application</a>.
          This implementation adapts its request, decode, and mashup workflow to public APIs.</p>
        <ul>
          <li>Send an HTTP GET request from PHP using cURL.</li>
          <li>Receive JSON and decode it into PHP arrays with <code>json_decode()</code>.</li>
          <li>Extract coordinates from the first response and use them as parameters in a second request.</li>
          <li>Display combined results with input validation, error handling, and escaped HTML.</li>
        </ul>
        <h3>Sample Google Maps API endpoint</h3>
        <p><a href="http://maps.googleapis.com/maps/api/geocode/json?address=disneyland,%20ca">Sample Real-World REST API: Disneyland, CA</a></p>
        <p>The <code>address</code> parameter illustrates how a service accepts a location and returns geographic information as JSON.
          Google Maps requires an API key and billing setup. You are not required to configure it for this lab.</p>
        <h3>Try the two-API mashup</h3>
        <p>Choose a sample JSONPlaceholder user. PHP retrieves that user's coordinates,
          then requests weather for those coordinates from Open-Meteo. No API key is needed for this noncommercial lab.</p>
        <p>JSONPlaceholder profiles are fictional. Their coordinates do not necessarily match their named cities;
          weather below is for the coordinates, not a verified user address.</p>
        <form method="get">
          <label for="user_id">Sample user ID</label>
          <select id="user_id" name="user_id">
            <?php for ($i = 1; $i <= 10; $i++): ?>
              <option value="<?= $i ?>" <?= $selected === $i ? 'selected' : '' ?>>User <?= $i ?></option>
            <?php endfor; ?>
          </select>
          <button class="button" type="submit">Get User and Weather</button>
        </form>
        <?php if ($error !== ''): ?>
          <p role="alert">Unable to complete the mashup: <?= escape($error) ?></p>
        <?php endif; ?>
        <?php if ($user !== null && $weather !== null && $error === ''): ?>
          <h3>Combined API results</h3>
          <dl>
            <dt>Sample user</dt><dd><?= escape($user['name'] ?? 'Unknown') ?></dd>
            <dt>Sample city (fictional)</dt><dd><?= escape($user['address']['city'] ?? 'Unknown') ?></dd>
            <dt>Requested coordinates</dt><dd><?= escape($lat) ?>, <?= escape($lon) ?></dd>
            <dt>Weather time</dt><dd><?= escape($weather['current']['time'] ?? '') ?> (<?= escape($weather['timezone'] ?? '') ?>)</dd>
            <dt>Temperature</dt><dd><?= escape($weather['current']['temperature_2m']) ?> <?= escape($weather['current_units']['temperature_2m'] ?? '') ?></dd>
            <dt>Relative humidity</dt><dd><?= escape($weather['current']['relative_humidity_2m']) ?> <?= escape($weather['current_units']['relative_humidity_2m'] ?? '') ?></dd>
            <dt>Wind speed</dt><dd><?= escape($weather['current']['wind_speed_10m']) ?> <?= escape($weather['current_units']['wind_speed_10m'] ?? '') ?></dd>
          </dl>
          <p>Open-Meteo current conditions are based on weather-model data.</p>
          <h3>HTTP requests sent by PHP</h3>
          <ol>
            <li><code><?= escape($userUrl) ?></code></li>
            <li><code><?= escape($weatherUrl) ?></code></li>
          </ol>
          <details><summary>View decoded JSON responses</summary>
            <h4>JSONPlaceholder</h4>
            <pre><?= escape(json_encode($user, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) ?></pre>
            <h4>Open-Meteo</h4>
            <pre><?= escape(json_encode($weather, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) ?></pre>
          </details>
        <?php endif; ?>
        <h3>How the mashup works</h3>
        <ol>
          <li>The form submits a user ID to this PHP page.</li>
          <li>PHP requests <code>/users/{id}</code> from JSONPlaceholder.</li>
          <li><code>json_decode()</code> converts JSON into an associative array.</li>
          <li>PHP reads <code>address.geo.lat</code> and <code>address.geo.lng</code>.</li>
          <li><code>http_build_query()</code> encodes the weather request parameters.</li>
          <li>PHP requests Open-Meteo weather and renders both responses together.</li>
        </ol>
        <p>API documentation: <a href="https://jsonplaceholder.typicode.com/">JSONPlaceholder</a> and
          <a href="https://open-meteo.com/en/docs">Open-Meteo</a>.
          Weather data by Open-Meteo, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>
        <a class="button" href="../../lab-work.html">Return to Lab Work</a>
      </section>
    </main>

    <footer id="about" class="scroll-mt-24 bg-[#10233f]">
      <div class="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p class="max-w-2xl text-sm leading-6 text-[#dce5ef]">
          Disclaimer: This is a student website created for course projects in
          IT 4403 Advanced Web and Mobile Applications at Kennesaw State
          University. The content is for educational purposes only.
        </p>
      </div>
    </footer>
  </body>
</html>
