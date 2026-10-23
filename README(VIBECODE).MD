# QR Attendance System

A teacher logs in, opens a class and generates a QR code with a 4-digit PIN. Students scan the QR with their phone, enter their student code and the PIN, and are marked present if they are enrolled in that class. Students do not log in.

For the full design (data model, endpoints, rules), see `docs/QR_ATTENDANCE_GUIDE.md`.

## Demo setup

| Role | Device | Opens |
|---|---|---|
| Teacher | PC / server | `http://<SERVER_IP>:3000/login` |
| Student | Phone (same Wi-Fi) | Scans the QR, which opens `http://<SERVER_IP>:3000/scan?token=...` |

`<SERVER_IP>` is the LAN address of the machine running the app (example: `192.168.0.184`). Never use `localhost` for anything the phone needs to reach, because on the phone `localhost` means the phone itself.

## Ports

| Service | Port |
|---|---|
| Frontend (React) | 3000 |
| Backend (API) | 4000 |
| MySQL | 3306 (local only, do not open to the network) |

## 1. Database (MySQL)

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p qr_attendance -e "SHOW TABLES;"
```

Expect six tables: `teacher`, `student`, `class`, `enrollment`, `qr_code`, `attendance`. Then load the sample data (1 teacher, students, a class, and enrollments) so the class already has students.

## 2. Find the server IP

**Linux**

```bash
ip -4 addr show | grep inet
```

Use the address on your Wi-Fi or Ethernet interface (not `127.0.0.1`).

**Windows**

```powershell
ipconfig
```

Use the `IPv4 Address` under your Wi-Fi or Ethernet adapter.

The IP can change when you reconnect to the network. Re-check it at the start of every session.

## 3. Configure environment files

Replace `192.168.0.184` with your server IP.

**Frontend** (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://192.168.0.184:4000
NEXT_PUBLIC_APP_URL=http://192.168.0.184:3000
```

- All API calls use `NEXT_PUBLIC_API_URL`.
- The QR code is built from `NEXT_PUBLIC_APP_URL`, so the phone opens the server's address.
- If your project reads `VITE_` variables instead, use the same names with that prefix. The prefix must match what `vite.config.js` exposes and what the code reads.

**Backend** (`.env` or `application.properties`)

```
PORT=4000
FRONTEND_ORIGIN=http://192.168.0.184:3000
```

- The backend must listen on `0.0.0.0`, not `127.0.0.1`.
- CORS must allow exactly `FRONTEND_ORIGIN` (same scheme, IP and port).
- QR lifetime is 15 minutes. After 5 wrong PIN attempts, a QR is locked.

Restart both servers after changing any env file.

## 4. Start the app

Start the backend first, then the frontend. Use the commands from your project, for example:

```bash
# Backend (use whichever applies)
npm run dev              # Node/Express
./mvnw spring-boot:run   # Spring Boot

# Frontend
npm run dev -- --host 0.0.0.0 --port 3000
```

## 5. Network setup

### Check the servers listen on all interfaces

**Linux**

```bash
ss -tlnp | grep -E ':3000|:4000'
```

**Windows**

```powershell
netstat -ano | findstr ":3000 :4000"
```

You should see `0.0.0.0:3000` and `0.0.0.0:4000` (or `*:3000`, `[::]:3000`). If you see `127.0.0.1`, only the server itself can connect. Fix the bind setting and restart.

### Open the firewall

**Linux, Ubuntu/Debian (ufw)**

```bash
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp
```

If `ufw status` says "inactive", the firewall is not blocking anything.

**Linux, Fedora/RHEL/CentOS (firewalld)**

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp --add-port=4000/tcp
sudo firewall-cmd --reload
```

**Windows (PowerShell as Administrator)**

```powershell
New-NetFirewallRule -DisplayName "QR dev" -Direction Inbound -Protocol TCP -LocalPort 3000,4000 -Action Allow -Profile Private
```

On Windows, also set your Wi-Fi network profile to **Private** (Settings > Network & Internet > Wi-Fi > your network). Rules created with `-Profile Private` do not apply to a Public network.

Do not open port 3306 (MySQL).

### Test from the phone

Connect the phone to the same Wi-Fi as the server. Turn mobile data off. Do not use a guest network.

1. Open `http://<SERVER_IP>:3000`. You should see the React app.
2. Open `http://<SERVER_IP>:4000`. Any response (even 404 or 401) means the backend is reachable. A timeout means the firewall or the network is blocking it.

### Use the IP on the server too

When the teacher uses a browser on the server, open `http://<SERVER_IP>:3000`, not `http://localhost:3000`. CORS only allows the `FRONTEND_ORIGIN` origin, so a page opened from `localhost` will have its API calls blocked.

## 6. Run a full test

1. On the server, open `http://<SERVER_IP>:3000/login` and log in as the seeded teacher.
2. Open a class and click "Generate QR". Note the PIN shown next to it.
3. On the phone, scan the QR. The page should open at `http://<SERVER_IP>:3000/scan?token=...`.
4. Enter an enrolled student's code and the PIN. Expect "Attendance recorded".
5. Check the teacher's attendance list shows the student.
6. Try the failure cases:

| Case | Expected result |
|---|---|
| Wrong PIN | "Invalid code or PIN" (401) |
| Student code not in the class | "You are not enrolled in this class" (403) |
| Same student scans again | "Already marked" (409) |
| QR older than 15 minutes | "This QR has expired" (410) |
| 5 wrong PINs on one QR | Locked (429), generate a new QR |

## 7. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Phone can't load the page (timeout) | Firewall closed, different Wi-Fi, or the network isolates devices (AP isolation, common on guest and campus Wi-Fi) |
| Page loads but API calls fail | CORS origin does not match `FRONTEND_ORIGIN` exactly, or the backend wasn't restarted |
| Works on the server, not on the phone | Server is bound to `127.0.0.1`, or the firewall blocks the port |
| API URL is `undefined` in the browser | Env variable prefix doesn't match what the code reads, or the frontend wasn't restarted |
| It worked yesterday but not today | The server's IP changed. Re-run the IP command and update both env files |
| QR opens `localhost` on the phone | `NEXT_PUBLIC_APP_URL` is wrong. It must be the server's LAN IP |

## Notes

- Plain HTTP on a local network is fine for a demo, but it is not secure for real use.
- Teachers are view-only. Classes and students come from sample data.
- Ideas for later (campus IP allowlist, GPS check, teacher edits) are listed in section 7.1 of the guide.