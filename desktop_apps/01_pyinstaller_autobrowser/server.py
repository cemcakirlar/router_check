#!/usr/bin/env python3
"""
Local proxy server for ZTE Router Dashboard.
Serves the HTML dashboard and proxies API requests to the router,
bypassing browser CORS restrictions.

Usage: python server.py
Then open http://localhost:8080 in your browser.
"""

import http.server
import json
import urllib.request
import urllib.parse
import urllib.error
import base64
import time
import os
import http.cookies
import threading
import sys
import webbrowser
import socket
import subprocess
import signal

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


def check_and_resolve_port_conflict(port):
    """Check if port is occupied and resolve it by killing the process if needed."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("0.0.0.0", port))
        s.close()
        return False
    except socket.error:
        print(f"⚠️ Port {port} is occupied. Attempting conflict recovery...")
        if sys.platform == 'darwin':
            try:
                output = subprocess.check_output(["lsof", "-t", "-i", f"tcp:{port}"], text=True)
                pids = [pid.strip() for pid in output.split("\n") if pid.strip()]
                print(f"🔍 Found PIDs using port {port}: {pids}")
                for pid in pids:
                    print(f"💀 Killing PID: {pid}")
                    subprocess.call(["kill", "-9", pid])
                time.sleep(1.0)
                s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    s2.bind(("0.0.0.0", port))
                    s2.close()
                    print(f"✅ Successfully reclaimed port {port}.")
                    return True
                except socket.error:
                    print(f"❌ Port {port} is still occupied after kill attempt.")
                    return False
            except Exception as ex:
                print(f"⚠️ Failed to resolve port conflict: {ex}")
                return False
        else:
            print("⚠️ Port conflict resolution is only supported on macOS.")
            return False


server = None
cleanup_completed = False


def perform_cleanup():
    global cleanup_completed, server
    if cleanup_completed:
        return
    print("🧹 Cleaning up resources...")
    try:
        print("  → Logging out from router...")
        do_logout()
    except Exception as e:
        print(f"Error during router logout: {e}")
    if server:
        try:
            print("  → Closing server socket...")
            server.server_close()
        except Exception as e:
            print(f"Error closing server: {e}")
    cleanup_completed = True
    print("✅ Cleanup completed.")


def signal_handler(signum, frame):
    print(f"Received signal {signum}. Starting cleanup...")
    perform_cleanup()
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

ROUTER_IP = "192.168.0.1"
PASSWORD = "FoldMund2204*"
BASE_URL = f"http://{ROUTER_IP}/goform"
PORT = 8080

HEADERS = {
    "Referer": f"http://{ROUTER_IP}/index.html",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "tr,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "X-Requested-With": "XMLHttpRequest"
}

# We'll use a cookie jar to maintain session cookies (like requests.Session does)
cookie_jar = http.cookies.SimpleCookie()
stored_cookies = {}
last_state = {
    "data": {},
    "stations": None,
    "static_ips": None
}


def log_diff(label, old_data, new_data):
    """Log only the fields that have changed between old_data and new_data."""
    if old_data is None:
        # First time seeing this data type
        return
        
    if isinstance(new_data, dict):
        changes = {k: v for k, v in new_data.items() if k not in old_data or old_data[k] != v}
        # Filter out extremely noisy fields if needed, but for now let's show all changes
        if changes:
            print(f"  Δ {label} changed: {changes}")
    elif isinstance(new_data, list):
        if old_data != new_data:
            print(f"  Δ {label} list changed ({len(new_data)} items)")


def make_request(url, data=None, method="GET"):
    """Make an HTTP request to the router, maintaining cookies."""
    global stored_cookies

    if data and method == "POST":
        encoded_data = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(url, data=encoded_data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
    else:
        req = urllib.request.Request(url, method="GET")

    for k, v in HEADERS.items():
        req.add_header(k, v)

    # Attach stored cookies
    if stored_cookies:
        cookie_header = "; ".join(f"{k}={v}" for k, v in stored_cookies.items())
        req.add_header("Cookie", cookie_header)

    try:
        response = urllib.request.urlopen(req, timeout=5)
        # Store any Set-Cookie headers
        for header in response.headers.get_all("Set-Cookie") or []:
            # Parse "key=value; path=/; ..." format
            parts = header.split(";")[0].strip()
            if "=" in parts:
                k, v = parts.split("=", 1)
                stored_cookies[k.strip()] = v.strip()
        
        # if stored_cookies:
        #     print(f"  → Stored Cookies: {stored_cookies}")

        body = response.read().decode("utf-8")
        
        # If we got HTML instead of JSON, it's almost certainly a redirect to login
        if "<html" in body.lower():
            print("  → Received HTML instead of JSON. Assuming session expired.")
            return {"result": "not_login"}
            
        try:
            return json.loads(body) if body.strip() else {}
        except json.JSONDecodeError:
            print(f"  → JSON Decode Error. Body starts with: {body[:50]}")
            return {"result": "not_login"} # Treat as not logged in to trigger retry
    except Exception as e:
        print(f"  Request error: {e}")
        return None


def do_login():
    """Login to the router and return the result."""
    enc_pass = base64.b64encode(PASSWORD.encode()).decode()
    payload = {
        "isTest": "false",
        "goformId": "LOGIN_MULTI_USER",
        "user": "admin",
        "password": enc_pass
    }
    url = f"{BASE_URL}/goform_set_cmd_process"
    result = make_request(url, data=payload, method="POST")
    print(f"  → Login response: {result}")
    
    # If the router responded, consider it a success as requested
    if result is not None:
        return {"result": "0", "router_response": result}
    return result


def do_logout():
    """Logout from the router and clear local session."""
    global stored_cookies
    payload = {
        "isTest": "false",
        "goformId": "LOGOUT"
    }
    url = f"{BASE_URL}/goform_set_cmd_process"
    result = make_request(url, data=payload, method="POST")
    print(f"  → Logout response: {result}")
    stored_cookies = {}  # Clear local session
    
    # If the router responded, consider it a success as requested
    if result is not None:
        return {"result": "0", "router_response": result}
    return result


def do_fetch_data(commands):
    """Fetch multi_data from the router."""
    params = urllib.parse.urlencode({
        "isTest": "false",
        "multi_data": "1",
        "cmd": commands,
        "_": int(time.time() * 1000)
    })
    url = f"{BASE_URL}/goform_get_cmd_process?{params}"
    return make_request(url)


def do_fetch_stations():
    """Fetch station_list from the router."""
    params = urllib.parse.urlencode({
        "isTest": "false",
        "cmd": "station_list",
        "_": int(time.time() * 1000)
    })
    url = f"{BASE_URL}/goform_get_cmd_process?{params}"
    return make_request(url)


def do_fetch_static_ips():
    """Fetch current_static_addr_list from the router."""
    params = urllib.parse.urlencode({
        "isTest": "false",
        "cmd": "current_static_addr_list",
        "_": int(time.time() * 1000)
    })
    url = f"{BASE_URL}/goform_get_cmd_process?{params}"
    return make_request(url)


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Custom log format. Only logs login and logout requests."""
        if any(x in self.path for x in ["login", "logout"]):
            print(f"  [{self.address_string()}] {format % args}")

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]

        # Serve the dashboard
        if path == "/" or path == "/index.html":
            self.serve_file("index.html", "text/html")
            return
        elif path == "/dashboard.js":
            self.serve_file("dashboard.js", "application/javascript")
            return

        # API: Login
        if path == "/api/login":
            print("  → Proxying LOGIN to router...")
            result = do_login()
            if result:
                self.send_json(result)
            else:
                self.send_json({"result": "failure", "error": "Could not reach router"}, 502)
            return

        # API: Fetch data
        if path == "/api/data":
            # Parse commands from query string
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            commands = qs.get("cmd", [""])[0]
            # print(f"  → Proxying DATA request...")
            result = do_fetch_data(commands)
            if result:
                log_diff("DATA", last_state["data"], result)
                last_state["data"].update(result)
                self.send_json(result)
            else:
                self.send_json({"error": "Failed to fetch data"}, 502)
            return

        # API: Fetch station list
        if path == '/api/stations':
            # print("  → Proxying STATION LIST request...")
            result = do_fetch_stations()
            if result:
                log_diff("STATIONS", last_state["stations"], result)
                last_state["stations"] = result
            self.send_json(result)
            return
        elif path == '/api/static_ips':
            # print("  → Proxying STATIC IPS request...")
            result = do_fetch_static_ips()
            if result:
                log_diff("STATIC_IPS", last_state["static_ips"], result)
                last_state["static_ips"] = result
            self.send_json(result)
            return

        # API: Logout
        if path == "/api/logout":
            print("  → Proxying LOGOUT to router...")
            result = do_logout()
            if result:
                self.send_json(result)
            else:
                self.send_json({"result": "failure", "error": "Could not reach router"}, 502)
            return


        # 404
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path = self.path.split("?")[0]

        if path == "/api/login":
            print("  → Proxying LOGIN to router...")
            result = do_login()
            if result:
                self.send_json(result)
            else:
                self.send_json({"result": "failure", "error": "Could not reach router"}, 502)
            return

        if path == "/api/logout":
            print("  → Proxying LOGOUT to router...")
            result = do_logout()
            if result:
                self.send_json(result)
            else:
                self.send_json({"result": "failure", "error": "Could not reach router"}, 502)
            return

        self.send_response(404)
        self.end_headers()

    def serve_file(self, filename, content_type):
        filepath = resource_path(filename)
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File not found")


def open_browser():
    """Opens the browser after a short delay to ensure the server is up."""
    time.sleep(1.5)
    print(f"  → Opening browser at http://localhost:{PORT}...")
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    check_and_resolve_port_conflict(PORT)
    server = http.server.HTTPServer(("", PORT), ProxyHandler)
    print(f"╔══════════════════════════════════════════════╗")
    print(f"║   Router Check (AutoBrowser) Proxy Server  ║")
    print(f"║   Open: http://localhost:{PORT}                ║")
    print(f"╚══════════════════════════════════════════════╝")
    
    # Start browser in a background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    try:
        server.serve_forever()
    except (KeyboardInterrupt, SystemExit):
        print("\nServer stopped.")
        perform_cleanup()
