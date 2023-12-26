#!/usr/bin/env bash

# Change working directory to project folder
cd "${0%/*}"

if ! command -v msgfmt &> /dev/null
then
    echo "Missing gettext!!!"
    echo "Please install gettext and re-run this installer"
    exit 1
fi

echo "Packing extension..."
gnome-extensions pack ./ \
    --extra-source=indicator.js \
    --podir=po \
    --force \

echo "Installing extension..."
gnome-extensions install upower-battery@codilia.com.shell-extension.zip --force

echo "Extension UPower Battery installed successfully. Restart the shell (or logout) to be able to enable the extension."
