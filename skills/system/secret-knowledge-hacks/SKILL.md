---
name: secret-knowledge-hacks
description: >
  Collection of powerful CLI tools, shell one-liners, hacks, and cheatsheets for DevOps,
  system administration, security, and penetration testing. Use when: "CLI tools",
  "shell tricks", "system diagnostics", "network tools", "security auditing", "pen testing",
  "Linux hardening", "Docker/Kubernetes tools", "curl hacks", "network scanning",
  "SSL/TLS testing", "performance profiling", "log analysis", "cheatsheets".
---

# Secret Knowledge Hacks

Curated collection of essential CLI tools, shell hacks, and system administration resources.

## When to Use

- Finding the right CLI tool for a task
- System administration and DevOps troubleshooting
- Security auditing and penetration testing
- Network diagnostics and monitoring
- Shell scripting and one-liners
- Performance profiling and debugging
- Container/Docker/Kubernetes operations
- SSL/TLS configuration testing

## Quick Reference Categories

### Shells & Prompt

| Tool | Description |
|------|-------------|
| `bash` | GNU Bourne Again Shell — default on most Linux |
| `zsh` | Z shell — enhanced interactivity + scripting |
| `fish` | Friendly Interactive Shell — smart autosuggestions |
| `starship` | Cross-shell prompt written in Rust |
| `powerlevel10k` | Fast Powerlevel9k reimplementation for Zsh |
| `oh-my-zsh` | Zsh configuration management framework |
| `bash-it` | Bash framework for custom commands/plugins |

### Shell Plugins & Enhancements

```bash
# fzf — fuzzy finder (universal)
brew install fzf
# Then add to ~/.zshrc:
source $(brew --prefix)/share/fzf/shell/key-bindings.zsh
source $(brew --prefix)/share/fzf/shell/completion.zsh

# z — jump to most-used directories
# Usage: z project (auto-completes path)

# zsh-autosuggestions — fish-like suggestions
# zsh-syntax-highlighting — syntax highlighting
```

### File & Directory Management

| Tool | Description |
|------|-------------|
| `fd` | Fast, user-friendly alternative to `find` |
| `rg` (ripgrep) | Fast regex search |
| `nnn` | Lightning-fast file manager |
| `ranger` | Vim-inspired console file manager |
| `ncdu` | Disk usage analyzer (CLI) |
| `mc` | Midnight Commander — visual file manager |

```bash
# fd examples
fd '\.py$'              # Find Python files
fd -e jpg -t d          # Find JPG files in directories
fd --type f -e md       # Markdown files only

# rg examples
rg "TODO" --glob '!node_modules/*'  # Search ignoring node_modules
rg -C 3 "function"                  # Show 3 lines context
rg -l "import" --type py            # List Python files with import
```

### Network Tools

#### Scanning & Discovery

| Tool | Purpose |
|------|---------|
| `nmap` | Network discovery & security auditing |
| `masscan` | Fastest Internet port scanner |
| `RustScan` | Faster than Nmap (auto-runs nmap) |
| `zmap` | Single-packet network scanner |
| `subfinder` | Subdomain enumeration |
| `amass` | Advanced subdomain enumeration |

```bash
# nmap quick scans
nmap -sV -sC target.com        # Version + default scripts
nmap -p- target.com            # All 65535 ports
nmap -A -T4 target.com         # Aggressive scan
nmap --script vuln target.com  # Vulnerability scan

# subfinder
subfinder -d example.com -o subdomains.txt

# amass
amass enum -d example.com -o amass_results.txt
```

#### HTTP & Web Testing

| Tool | Purpose |
|------|---------|
| `curl` | Transfer data with URLs |
| `httpie` | User-friendly HTTP client |
| `wrk` | Modern HTTP benchmarking |
| `bombardier` | Fast cross-platform HTTP benchmark |
| `vegeta` | HTTP load testing |
| `gobuster` | Directory/file & DNS busting |
| `httpstat` | Visualize curl statistics |

```bash
# curl power tips
curl -I https://example.com       # Headers only
curl -v https://api.example.com   # Verbose (see handshake)
curl --connect-timeout 5 https://api.example.com  # Timeout
curl -H "Authorization: Bearer $TOKEN" api.example.com
curl -X POST -d @payload.json -H "Content-Type: application/json"

# httpie (replacement for curl)
http GET api.example.com Authorization:"Bearer $TOKEN"
http POST api.example.com name="John" age:=30

# gobuster
gobuster dir -u https://example.com -w /usr/share/wordlists/dirb/big.txt
```

#### Network Diagnostics

| Tool | Purpose |
|------|---------|
| `tcpdump` | Packet analyzer |
| `tshark` | Wireshark CLI |
| `mtr` | traceroute + ping combined |
| `socat` | bidirectional data transfer |
| `netcat` | Network Swiss Army knife |
| `iperf3` | Bandwidth measurement |
| `vnstat` | Network traffic monitor |

```bash
# tcpdump examples
tcpdump -i eth0 port 80 -w capture.pcap
tcpdump -nn host 192.168.1.1 and port 443
tcpdump -A 'http contains "POST"'

# mtr (better than traceroute)
mtr -r -c 100 example.com  # Report mode, 100 pings

# socat examples
socat -v TCP-LISTEN:8080,fork TCP:target.com:80  # HTTP proxy
socat UDP-Listen:5353 system:"nslookup %a"       # DNS relay
```

#### DNS Tools

| Tool | Purpose |
|------|---------|
| `dig` | DNS lookup utility |
| `dnsdiag` | DNS diagnostics & performance |
| `fierce` | DNS reconnaissance |
| `knock` | Subdomain enumeration via wordlist |
| `dnscrypt-proxy` | Encrypted DNS proxy |
| `massdns` | High-performance DNS resolver |

```bash
# dig examples
dig example.com ANY
dig +trace example.com     # Full trace
dig +noall +answer example.com  # Minimal output
dig -x 8.8.8.8            # Reverse DNS
```

### SSL/TLS Tools

| Tool | Purpose |
|------|---------|
| `openssl` | TLS/SSL toolkit |
| `testssl.sh` | TLS/SSL testing anywhere |
| `sslyze` | Fast SSL/TLS scanner |
| `sslscan` | Cipher suite discovery |
| `cipherscan` | Quick ciphersuites check |
| `certbot` | Let's Encrypt certificates |

```bash
# openssl quick commands
openssl s_client -connect example.com:443 -servername example.com
openssl x509 -in cert.pem -text -noout
openssl rsa -in key.pem -check
openssl req -newkey rsa:4096 -keyout key.pem -out cert.csr

# testssl.sh
./testssl.sh example.com
./testssl.sh --server-defaults example.com
./testssl.sh --fast --color 2 example.com

# Check certificate expiry
echo | openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Security & Auditing

#### System Hardening

| Tool | Purpose |
|------|---------|
| `Lynis` | Security auditing |
| `rkhunter` | Rootkit detection |
| `Chkrootkit` | Rootkit scanner |
| `apparmor` | Mandatory Access Control |
| `SELinux` | MAC system (RedHat) |
| `fail2ban` | Intrusion prevention |

```bash
# Lynis audit
lynis audit system
lynis audit system --quick
lynis show statistics

# rkhunter
rkhunter --check --skip-keypress
rkhunter --update
rkhunter --cronjob
```

#### Penetration Testing

| Tool | Purpose |
|------|---------|
| `Metasploit` | Exploitation framework |
| `Burp Suite` | Web vulnerability scanner |
| `OWASP ZAP` | Open-source web scanner |
| `sqlmap` | SQL injection automation |
| `nmap scripts` | NSE for vuln scanning |
| `gobuster` | Directory brute force |

```bash
# nmap vulnerability scripts
nmap --script http-shellshock -p 80 target
nmap --script smb-vuln-* target
nmap --script ssl-enum-ciphers -p 443 target

# sqlmap
sqlmap -u "http://target/page?id=1" --dbs
sqlmap -u "http://target/page?id=1" --dump -T users
```

### System Diagnostics

#### Performance

| Tool | Purpose |
|------|---------|
| `htop` | Interactive process viewer |
| `btop` | Beautiful resource monitor |
| `glances` | Cross-platform monitoring |
| `atop` | Advanced performance monitor |
| `perf` | Performance analysis (Linux) |
| `strace` | System call tracer |
| `ltrace` | Library call tracer |
| `bpftrace` | eBPF tracing language |

```bash
# perf examples
perf top                   # Live profiling
perf record -g ./app       # Record with callgraph
perf report                # View results
perf stat -e cycles,cache-misses ./app  # Counters

# strace
strace -p $(pgrep -f myapp)
strace -c -e trace=open,read,write ./app  # Summary
strace -ff -e trace=file -o trace.log ./app  # Per-thread files

# lsof
lsof -i :8080              # Processes on port 8080
lsof -p 1234               # Files opened by PID
lsof +L1                   # Files with deleted content
```

#### Memory & CPU

```bash
# Memory analysis
free -h                    # Memory usage
cat /proc/meminfo          # Detailed memory info
vmstat 1                   # Virtual memory stats
sar -r 1 5                 # Memory over 5 seconds

# CPU analysis
top -o %CPU                # Sort by CPU
mpstat -P ALL 1            # Per-CPU stats
pidstat -u 1               # Per-process CPU

# Disk I/O
iostat -x 1                # Extended disk stats
iotop                      # Disk I/O per process
```

### Container & Orchestration

| Tool | Purpose |
|------|---------|
| `docker` | Container runtime |
| `podman` | Daemonless Docker alternative |
| `kubectl` | Kubernetes CLI |
| `helm` | Kubernetes package manager |
| `trivy` | Container vulnerability scanner |
| `docker-bench-security` | Docker security checks |
| `kompose` | Docker Compose → Kubernetes |
| `portainer` | Docker web UI |

```bash
# Docker quick commands
docker system df           # Disk usage
docker system prune -a     # Clean all unused
docker ps --size           # Show container sizes
docker stats --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Docker security
docker scan myimage        # Trivy integration
docker-bench-security      # Audit Docker

# Kubernetes
kubectl top nodes
kubectl top pods --all-namespaces
kubectl describe pod <name> -n <namespace>
kubectl logs <pod> -n <namespace> --tail=100
```

### Log Analysis

| Tool | Purpose |
|------|---------|
| `lnav` | Log file navigator |
| `GoAccess` | Web log analyzer |
| `ngxtop` | Nginx real-time metrics |
| `angle-grinder` | Log slicing/dicing |
| `gron` | Make JSON greppable |

```bash
# lnav
lnav /var/log/nginx/access.log
# Features: syntax highlighting, search, follow mode

# GoAccess
goaccess /var/log/nginx/access.log -a --log-format=COMBINED -o report.html

# Process logs with jq
cat access.log | jq -r 'select(.status >= 400) | .url'
```

### Database CLI

| Tool | Purpose |
|------|---------|
| `pgcli` | PostgreSQL with autocomplete |
| `mycli` | MySQL with autocomplete |
| `litecli` | SQLite with autocomplete |
| `iredis` | Redis with autocomplete |
| `usql` | Universal SQL CLI |

```bash
# pgcli
pgcli -h localhost -U myuser -d mydb
pgcli "SELECT * FROM users LIMIT 10;"

# iredis
iredis
127.0.0.1:6379> GET mykey
127.0.0.1:6379> KEYS "user:*"
```

### Shell Tricks

#### Pure Bash (No External Commands)

```bash
# String manipulation
str="hello world"
echo ${str^^}               # HELLO WORLD
echo ${str,,}               # hello world
echo ${str:0:5}             # hello
echo ${str/world/planet}    # hello planet

# Array operations
arr=(a b c d)
echo ${arr[@]}              # a b c d
echo ${#arr[@]}             # 4 (length)
echo ${arr[*]:1:2}          # b c (slice)

# Brace expansion
echo {A,B,C}{1,2,3}        # A1 A2 A3 B1 B2 B3 C1 C2 C3
echo file{01..10}.txt      # file01.txt ... file10.txt

# Process substitution
diff <(ls dir1) <(ls dir2)  # Compare directory listings

# Background jobs
command &                   # Run in background
jobs -l                     # List background jobs
fg %1                       # Bring job 1 to foreground
```

#### Useful One-Liners

```bash
# Find large files (>100MB)
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null

# Kill processes using specific port
lsof -ti:8080 | xargs kill -9

# Monitor log in real-time with grep
tail -f /var/log/syslog | grep --color=auto "error\|warning"

# Create tar.gz with progress
tar czf archive.tar.gz ./folder | pv | gzip > archive.tar.gz.gz

# SSH with proxy jump
ssh -J jump-host.target.com direct.target.com

# rsync with progress
rsync -avh --progress src/ user@host:/dest/

# Quick HTTP server
python3 -m http.server 8000
npx serve .

# JSON formatting
cat data.json | jq '. | keys'
curl api.example.com | jq '.data[] | {name, id}'
```

### Cheatsheets & References

| Resource | URL |
|----------|-----|
| cheat.sh | https://cheat.sh/ — "the only cheat sheet you need" |
| DevDocs | https://devdocs.io/ — Multiple API docs combined |
| The Art of Command Line | https://github.com/jlevy/the-art-of-command-line |
| Pure Bash Bible | https://github.com/dylanaraps/pure-bash-bible |
| Linux Cheat | https://github.com/cirosantilli/linux-cheat |
| Nginx Admin's Handbook | https://github.com/trimstray/nginx-admins-handbook |
| Nginx Config Generator | https://digitalocean.github.io/nginxconfig.io |
| DevOps Guide | https://github.com/Tikam02/DevOps-Guide |

## Best Practices

1. **Use `cheat.sh` for quick references**: `curl cheat.sh/git` or `curl cheat.sh/bash-arrays`
2. **Prefer `fd` over `find`**, `rg` over `grep`, `bat` over `cat`
3. **Use `tmux` or `screen`** for persistent sessions
4. **Always test destructive commands with `--dry-run`** first
5. **Use `set -euo pipefail`** in bash scripts for safety
6. **Prefer `systemd` services** over cron for long-running processes
7. **Use `journalctl`** for systemd log viewing
8. **Enable SSH keys** instead of passwords for server access
9. **Rotate logs** with `logrotate`
10. **Monitor with `cron` + alerts**, not just manual checks

## Related Resources

- Awesome Sysadmin: https://github.com/kahun/awesome-sysadmin
- Awesome Shell: https://github.com/alebcay/awesome-shell
- Awesome Security Hardening: https://github.com/decalage2/awesome-security-hardening
- The Practical Linux Hardening Guide: https://github.com/trimstray/the-practical-linux-hardening-guide
- Linux Hardening Guide: https://madaidans-insecurities.github.io/guides/linux-hardening.html
- System Design Primer: https://github.com/donnemartin/system-design-primer
