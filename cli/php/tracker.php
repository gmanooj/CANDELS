#!/usr/bin/env php
<?php

// Candels PHP CLI Utility
$backend_url = getenv('CANDELS_BACKEND_URL') ?: 'http://localhost:5000';
$session_file = sys_get_temp_dir() . '/.candels_php_session.json';

if ($argc < 2) {
    echo "Candels PHP CLI Utility\n";
    echo "Usage: php tracker.php [command]\n";
    echo "Available commands: login, init, status, logout\n";
    exit(1);
}

$command = $argv[1];

switch ($command) {
    case 'login':
        echo "[Cloud] Connecting to Candels Cloud Services...\n";
        echo "Enter registered email: ";
        $email = trim(fgets(STDIN));
        echo "Enter password: ";
        // Disable echo for password inputs
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            system('stty -echo');
        }
        $password = trim(fgets(STDIN));
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            system('stty echo');
        }
        echo "\n";

        $payload = json_encode([
            'email' => $email,
            'password' => $password,
            'device_name' => gethostname()
        ]);

        $ch = curl_init("$backend_url/api/cli/login");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $res = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 200) {
            $data = json_decode($res, true);
            file_put_contents($session_file, json_encode([
                'token' => $data['token'],
                'email' => $email,
                'device_name' => gethostname()
            ]));
            echo "[Success] Authenticated PHP CLI cleanly!\n";
        } else {
            echo "[Error] Authentication failed. Check your password or status.\n";
        }
        break;

    case 'init':
        if (!file_exists($session_file)) {
            echo "[Warning] No session. Run login first.\n";
            exit(1);
        }
        $config_file = getcwd() . '/.candels_php_config.json';
        $session = json_decode(file_get_contents($session_file), true);
        file_put_contents($config_file, json_encode([
            'email' => $session['email'],
            'linked_at' => date('Y-m-d H:i:s')
        ]));
        echo "[Local] Workspace initialized and configuration file dumped.\n";
        break;

    case 'status':
        if (!file_exists($session_file)) {
            echo "[Warning] Not logged in.\n";
        } else {
            $session = json_decode(file_get_contents($session_file), true);
            echo "Logged in as: " . $session['email'] . "\n";
            echo "Device name: " . $session['device_name'] . "\n";
        }
        break;

    case 'logout':
        if (file_exists($session_file)) {
            unlink($session_file);
        }
        echo "[Success] PHP CLI session terminated.\n";
        break;

    default:
        echo "Unknown command: $command\n";
        break;
}
