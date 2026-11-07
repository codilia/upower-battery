# DESCRIPTION

Battery indicator for UPower-supported mice and keyboards.
Based on https://extensions.gnome.org/extension/2170/keyboard-battery/ and https://extensions.gnome.org/extension/3991/bluetooth-battery/

# INSTALLATION

## Install from git (direct)

1. From your terminal, go to "~/.local/share/gnome-shell/extensions"
2. Clone the source code from git:
```shell
git clone https://github.com/codilia/upower-battery.git upower-battery@codilia.com
```
3. Compile schemas:  
```shell
glib-compile-schemas schemas/
```
5. Enable extension
```shell
gnome-extensions enable upower-battery@codilia.com
```
4. Restart gnome-shell: Alt + F2, type 'r' then hit Enter (X only). For Wayland logout and login again.

## Install from git (via `gnome-extensions`)

1. Clone the source code from git:
```shell
git clone https://github.com/codilia/upower-battery.git upower-battery && cd upower-battery
```
2. Package the extension
```shell
gnome-extensions pack --extra-source=indicator.js .
```
3. Install the extension
```shell
gnome-extensions install upower-battery@codilia.com.shell-extension.zip
```
5. Enable extension
```shell
gnome-extensions enable upower-battery@codilia.com
```
4. Restart gnome-shell: Alt + F2, type 'r' then hit Enter (X only). For Wayland logout and login again.

# TROUBLESHOOTING

This extension retrieve device's info using DBusProxy & GlibUPower, if you ever notice any issue with the extension:
   1. First, check if UPower can see your device, this extension can only see you device if UPower does
      method 1: Issue 'upower -d | egrep 'mouse|keyboard' -A 7' in your terminnal
      method 2: Run gnome-power-statistics
   2. Check gnome-shell log:
      journalctl /usr/bin/gnome-shell | grep upower-battery		   # this commmand will dump all gnome-shell log ever record
      journalctl -f /usr/bin/gnome-shell | grep upower-battery		# this will only show new log

