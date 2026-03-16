# Vaultify - Premium Password Manager

Vaultify is a secure, client-side password manager built with pure HTML, CSS, and JavaScript. It provides a clean, premium interface for securely storing and managing your credentials (usernames and passwords) locally within your web browser.

## Features

- **Master Password Protection**: Access to the vault is strictly guarded by a single master password that you create.
- **Client-Side Encryption**: All your sensitive credentials are encrypted and decrypted locally in your browser. No plaintext data is ever sent over the internet or to a remote server.
- **Local Storage**: The encrypted vault is stored securely in your browser's `localStorage`.
- **Search & Filter**: Quickly find stored credentials by searching for the website or username.
- **Copy & Delete Utilities**: Easily copy passwords directly to your clipboard or remove credentials.
- **Zero-Recovery Design (Reset Vault)**: Dedicated option to completely discard and erase the local vault if needed.

## Security & Core Technologies

Vaultify adheres to robust security practices, employing state-of-the-art web cryptography native to modern browsers using the **Web Crypto API** (`Window.crypto.subtle`).

### 1. Key Derivation (PBKDF2)
Instead of using your raw password directly for encryption, Vaultify derives a strong cryptographic key using **PBKDF2** (Password-Based Key Derivation Function 2).
- **Hash Algorithm**: SHA-256.
- **Iterations**: 100,000 rounds. This heavy mathematical work intentionally slows down the key derivation process, making brute-force and dictionary attacks computationally expensive.
- **Salt**: A unique, cryptographically secure 16-byte random salt is generated for each encryption operation. This prevents attackers from using precomputed hashes (like rainbow tables).

### 2. Data Encryption (AES-GCM)
The 256-bit key derived from PBKDF2 is then used to encrypt your entire password vault (a serialized JSON array).
- **Algorithm**: **AES-256-GCM** (Advanced Encryption Standard in Galois/Counter Mode). AES is the industry standard for symmetric encryption.
- **Initialization Vector (IV)**: A cryptographically random 12-byte IV is used for every encryption, ensuring that encrypting the same vault contents multiple times yields entirely different ciphertext.
- **Data Authenticity**: GCM is an authenticated encryption mode. It not only ensures confidentiality but also guarantees data integrity. If the encrypted vault payload in `localStorage` is maliciously tampered with or corrupted, the decryption process will structurally fail, safeguarding you against altered data.

### 3. Storage Format
The vault data is never saved as plaintext. The object persisted to the browser's local storage consists exclusively of Base64-encoded strings representing:
- The `salt` utilized for key derivation.
- The `iv` (Initialization Vector) used during encryption.
- The `ciphertext` (the actual encrypted vault data).

## How to Use

1. Clone or download this project.
2. Open `index.html` in any modern web browser supporting the Web Crypto API.
3. **Setup**: On your first visit, you will be prompted to create a Master Password.
4. **Unlock**: On subsequent visits, enter your Master Password to decrypt your vault and access your credentials.
5. **Manage**: Add websites, usernames, and passwords to store them securely.

## Important Limitations & Warnings

Since Vaultify is a purely local application without a backend server:
- **No Password Recovery**: There is deliberately no "forgot password" button. If you lose your Master Password, your stored credentials cannot be recovered under any circumstances.
- **Local Device Confinement**: The vault is strictly stored in the specific browser and device you use to create it. It does not automatically sync across different devices.
- **Data Persistence**: Clearing your browser's site data or cache will instantly and permanently destroy your encrypted vault. Consider manually backing up your data if required.
