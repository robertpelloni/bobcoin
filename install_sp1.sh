#!/usr/bin/env bash

# Reference: https://github.com/foundry-rs/foundry/blob/master/foundryup/install

set -e

echo "🚀 Installing sp1up..." && echo

BASE_DIR=$HOME
SP1_DIR=${SP1_DIR-"$BASE_DIR/.sp1"}
SP1_BIN_DIR="$SP1_DIR/bin"

BIN_URL="https://raw.githubusercontent.com/succinctlabs/sp1/main/sp1up/sp1up"
BIN_PATH="$SP1_BIN_DIR/sp1up"

# Create the .sp1 bin directory and sp1up binary if it doesn't exist.
mkdir -p $SP1_BIN_DIR
curl -# -L $BIN_URL -o $BIN_PATH
chmod +x $BIN_PATH

# Store the correct profile file (i.e. .profile for bash or .zshenv for ZSH).
case $SHELL in
*/zsh)
    PROFILE=${ZDOTDIR-"$HOME"}/.zshenv
    PREF_SHELL=zsh
    ;;
*/bash)
    PROFILE=$HOME/.bashrc
    PREF_SHELL=bash
    ;;
*/fish)
    PROFILE=$HOME/.config/fish/config.fish
    PREF_SHELL=fish
    ;;
*/ash)
    PROFILE=$HOME/.profile
    PREF_SHELL=ash
    ;;
*)
    echo "sp1up: could not detect shell, manually add ${SP1_BIN_DIR} to your PATH."
    exit 1
esac

# Only add sp1up if it isn't already in PATH.
if [[ ":$PATH:" != *":${SP1_BIN_DIR}:"* ]]; then
    # Add the sp1up directory to the path and ensure the old PATH variables remain.
    echo >> $PROFILE && echo "export PATH=\"\$PATH:$SP1_BIN_DIR\"" >> $PROFILE
fi

# Warn MacOS users that they may need to manually install libusb via Homebrew:
if [[ "$OSTYPE" =~ ^darwin ]] && [[ ! -f /usr/local/opt/libusb/lib/libusb-1.0.0.dylib && ! -f /opt/homebrew/opt/libusb/lib/libusb-1.0.0.dylib ]]; then
    echo && echo "warning: libusb not found. You may need to install it manually on MacOS via Homebrew (brew install libusb)."
fi

# Warn MacOS users that they may need to manually install openssl via Homebrew:
if [[ "$OSTYPE" =~ ^darwin ]] && [[ ! -f /usr/local/opt/openssl/lib/libssl.3.dylib && ! -f /opt/homebrew/opt/openssl/lib/libssl.3.dylib ]]; then
    echo && echo "warning: openssl not found. You may need to install it manually on MacOS via Homebrew (brew install openssl)."
fi

echo && echo "✅ Installation complete!"

echo && echo "🔍 Detected shell: ${PREF_SHELL}"
echo "🔗 Added sp1up to PATH"

echo && echo "To start using sp1up, please run:"
echo && echo "▶ source ${PROFILE}"
echo "▶ sp1up"

echo && echo "🎉 Enjoy using sp1up! For help, type 'sp1up --help'"
