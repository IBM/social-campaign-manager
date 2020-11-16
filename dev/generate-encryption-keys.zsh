#!/bin/zsh

# NOTE: This script is an example of how to generate encryption keys used in the Social Campaign Manager application.
# Particular care needs to be taken when producing encryption keys as a potential loss of an encryption key may
# render the encrypted data unreadable.

PRIVATE_KEY_FILE=server/keys/private.pem
PUBLIC_KEY_FILE=server/keys/public.pem

PROJECT_DIR=$(pwd)

if ! type "openssl" > /dev/null; then
    echo "The 'openssl' command does not exist. You may need to install it."
    echo "You can use 'brew install openssl' to get it"
    exit 1
fi

if test -f "$PRIVATE_KEY_FILE"; then
    echo "Encryption private key exists."
else
    echo "Private key does not exist. Generating keys..."
    cd $PROJECT_DIR/server/keys && openssl genrsa -out private.pem 4096
    cd $PROJECT_DIR/server/keys && openssl rsa -in private.pem -outform PEM -pubout -out public.pem
fi

if test -f "$PUBLIC_KEY_FILE"; then
    echo "Encryption public key exists."
else
    echo "Public key does not exist. Generating from private key..."
    cd $PROJECT_DIR/server/keys && openssl rsa -in private.pem -outform PEM -pubout -out public.pem
fi
