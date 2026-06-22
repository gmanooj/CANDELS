package com.candels;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class Main {
    private static final String BACKEND_URL = "http://localhost:5000";
    private static final String SESSION_FILE = System.getProperty("java.io.tmpdir") + "/.candels_java_session";

    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Candels Java CLI Utility");
            System.out.println("Usage: java -jar candels-cli.jar [login|init|status|logout]");
            return;
        }

        String command = args[0].toLowerCase();
        switch (command) {
            case "login":
                handleLogin();
                break;
            case "init":
                handleInit();
                break;
            case "status":
                handleStatus();
                break;
            case "logout":
                handleLogout();
                break;
            default:
                System.out.println("Unknown command: " + command);
        }
    }

    private static void handleLogin() {
        System.out.println("[Cloud] Connecting to Candels Cloud Services...");
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter registered email: ");
        String email = scanner.nextLine();
        System.out.print("Enter password: ");
        String password = scanner.nextLine();

        try {
            URL url = new URL(BACKEND_URL + "/api/cli/login");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            String jsonPayload = String.format("{\"email\":\"%s\",\"password\":\"%s\",\"device_name\":\"JavaCLI\"}", email, password);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes());
                os.flush();
            }

            int code = conn.getResponseCode();
            if (code == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    
                    // Simple parse token
                    String body = response.toString();
                    String searchStr = "\"token\":\"";
                    int idx = body.indexOf(searchStr);
                    if (idx != -1) {
                        String token = body.substring(idx + searchStr.length(), body.indexOf("\"", idx + searchStr.length()));
                        
                        // Save token
                        try (FileWriter writer = new FileWriter(SESSION_FILE)) {
                            writer.write(token + "\n" + email);
                        }
                        System.out.println("[Success] Authenticated Java CLI successfully.");
                    }
                }
            } else {
                System.out.println("[Error] Authentication failed with response code: " + code);
            }
        } catch (Exception e) {
            System.out.println("[Error] Request failed: " + e.getMessage());
        }
    }

    private static void handleInit() {
        File sessionFile = new File(SESSION_FILE);
        if (!sessionFile.exists()) {
            System.out.println("[Warning] No active session. Run 'login' command first.");
            return;
        }
        
        File configFile = new File(".candels_java_config");
        try (FileWriter writer = new FileWriter(configFile)) {
            writer.write("linked=true\n");
            System.out.println("[Local] Workspace initialized and connected to Candels.");
        } catch (Exception e) {
            System.out.println("[Error] Failed to initialize: " + e.getMessage());
        }
    }

    private static void handleStatus() {
        File sessionFile = new File(SESSION_FILE);
        if (!sessionFile.exists()) {
            System.out.println("[Warning] Not logged in.");
        } else {
            try (BufferedReader reader = new BufferedReader(new FileReader(sessionFile))) {
                reader.readLine(); // skip token
                String email = reader.readLine();
                System.out.println("Logged in as: " + email);
                System.out.println("Status: Active Session Link");
            } catch (Exception e) {
                System.out.println("Error reading session status.");
            }
        }
    }

    private static void handleLogout() {
        File sessionFile = new File(SESSION_FILE);
        if (sessionFile.exists()) {
            sessionFile.delete();
        }
        System.out.println("[Success] Session logged out cleanly.");
    }
}
