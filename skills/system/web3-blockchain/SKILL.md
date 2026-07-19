---
name: web3-blockchain
description: |
  [RU] Макро-навык для Web3 и блокчейна: Ethereum, Solana, Base, DeFi, NFT, смарт-контракты. Используй при запросах: "написать смарт-контракт", "Solidity security", "DeFi-протокол", "NFT-стандарты (ERC-721/1155)", "разработка на Solana / Base", "интеграция с Ethereum", "Web3-кошелёк".
  [EN] Macro-skill for Web3 and blockchain: Ethereum, Solana, Base, DeFi, NFTs, smart contracts. Triggers: blockchain development, DeFi, NFTs, smart contracts.
metadata:
  category: web3
  triggers:
    - Блокчейн
    - Web3
    - DeFi
    - NFT
    - Смарт-контракты (Solidity)
    - Ethereum
    - Solana / Base
    - Blockchain
    - Web3
    - DeFi
    - NFT
    - Smart contracts
    - Ethereum
    - Solana
---

# MACRO-SKILL: WEB3-BLOCKCHAIN
This is a superset of the following micro-skills: codex-hermes-agent-main--optional-skills--blockchain--base, codex-agents-main--plugins--blockchain-web3--skills--nft-standards, codex-hermes-agent-main--optional-skills--blockchain--solana, codex-agents-main--plugins--blockchain-web3--skills--defi-protocol-templates

## Component: codex-hermes-agent-main--optional-skills--blockchain--base

---
name: base
description: Query Base (Ethereum L2) blockchain data with USD pricing — wallet balances, token info, transaction details, gas analysis, contract inspection, whale detection, and live network stats. Uses Base RPC + CoinGecko. No API key required.
version: 0.1.0
author: youssefea
license: MIT
metadata:
  hermes:
    tags: [Base, Blockchain, Crypto, Web3, RPC, DeFi, EVM, L2, Ethereum]
    related_skills: []
---

# Base Blockchain Skill

Query Base (Ethereum L2) on-chain data enriched with USD pricing via CoinGecko.
8 commands: wallet portfolio, token info, transactions, gas analysis,
contract inspection, whale detection, network stats, and price lookup.

No API key needed. Uses only Python standard library (urllib, json, argparse).

---

## When to Use

- User asks for a Base wallet balance, token holdings, or portfolio value
- User wants to inspect a specific transaction by hash
- User wants ERC-20 token metadata, price, supply, or market cap
- User wants to understand Base gas costs and L1 data fees
- User wants to inspect a contract (ERC type detection, proxy resolution)
- User wants to find large ETH transfers (whale detection)
- User wants Base network health, gas price, or ETH price
- User asks "what's the price of USDC/AERO/DEGEN/ETH?"

---

## Prerequisites

The helper script uses only Python standard library (urllib, json, argparse).
No external packages required.

Pricing data comes from CoinGecko's free API (no key needed, rate-limited
to ~10-30 requests/minute). For faster lookups, use `--no-prices` flag.

---

## Quick Reference

RPC endpoint (default): https://mainnet.base.org
Override: export BASE_RPC_URL=https://your-private-rpc.com

Helper script path: ~/.hermes/skills/blockchain/base/scripts/base_client.py

```
python3 base_client.py wallet   <address> [--limit N] [--all] [--no-prices]
python3 base_client.py tx       <hash>
python3 base_client.py token    <contract_address>
python3 base_client.py gas
python3 base_client.py contract <address>
python3 base_client.py whales   [--min-eth N]
python3 base_client.py stats
python3 base_client.py price    <contract_address_or_symbol>
```

---

## Procedure

### 0. Setup Check

```bash
python3 --version

# Optional: set a private RPC for better rate limits
export BASE_RPC_URL="https://mainnet.base.org"

# Confirm connectivity
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py stats
```

### 1. Wallet Portfolio

Get ETH balance and ERC-20 token holdings with USD values.
Checks ~15 well-known Base tokens (USDC, WETH, AERO, DEGEN, etc.)
via on-chain `balanceOf` calls. Tokens sorted by value, dust filtered.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py \
  wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

Flags:
- `--limit N` — show top N tokens (default: 20)
- `--all` — show all tokens, no dust filter, no limit
- `--no-prices` — skip CoinGecko price lookups (faster, RPC-only)

Output includes: ETH balance + USD value, token list with prices sorted
by value, dust count, total portfolio value in USD.

Note: Only checks known tokens. Unknown ERC-20s are not discovered.
Use the `token` command with a specific contract address for any token.

### 2. Transaction Details

Inspect a full transaction by its hash. Shows ETH value transferred,
gas used, fee in ETH/USD, status, and decoded ERC-20/ERC-721 transfers.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py \
  tx 0xabc123...your_tx_hash_here
```

Output: hash, block, from, to, value (ETH + USD), gas price, gas used,
fee, status, contract creation address (if any), token transfers.

### 3. Token Info

Get ERC-20 token metadata: name, symbol, decimals, total supply, price,
market cap, and contract code size.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py \
  token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

Output: name, symbol, decimals, total supply, price, market cap.
Reads name/symbol/decimals directly from the contract via eth_call.

### 4. Gas Analysis

Detailed gas analysis with cost estimates for common operations.
Shows current gas price, base fee trends over 10 blocks, block
utilization, and estimated costs for ETH transfers, ERC-20 transfers,
and swaps.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py gas
```

Output: current gas price, base fee, block utilization, 10-block trend,
cost estimates in ETH and USD.

Note: Base is an L2 — actual transaction costs include an L1 data
posting fee that depends on calldata size and L1 gas prices. The
estimates shown are for L2 execution only.

### 5. Contract Inspection

Inspect an address: determine if it's an EOA or contract, detect
ERC-20/ERC-721/ERC-1155 interfaces, resolve EIP-1967 proxy
implementation addresses.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py \
  contract 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

Output: is_contract, code size, ETH balance, detected interfaces
(ERC-20, ERC-721, ERC-1155), ERC-20 metadata, proxy implementation
address.

### 6. Whale Detector

Scan the most recent block for large ETH transfers with USD values.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py \
  whales --min-eth 1.0
```

Note: scans the latest block only — point-in-time snapshot, not historical.
Default threshold is 1.0 ETH (lower than Solana's default since ETH
values are higher).

### 7. Network Stats

Live Base network health: latest block, chain ID, gas price, base fee,
block utilization, transaction count, and ETH price.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py stats
```

### 8. Price Lookup

Quick price check for any token by contract address or known symbol.

```bash
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py price ETH
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py price USDC
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py price AERO
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py price DEGEN
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py price 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

Known symbols: ETH, WETH, USDC, cbETH, AERO, DEGEN, TOSHI, BRETT,
WELL, wstETH, rETH, cbBTC.

---

## Pitfalls

- **CoinGecko rate-limits** — free tier allows ~10-30 requests/minute.
  Price lookups use 1 request per token. Use `--no-prices` for speed.
- **Public RPC rate-limits** — Base's public RPC limits requests.
  For production use, set BASE_RPC_URL to a private endpoint
  (Alchemy, QuickNode, Infura).
- **Wallet shows known tokens only** — unlike Solana, EVM chains have no
  built-in "get all tokens" RPC. The wallet command checks ~15 popular
  Base tokens via `balanceOf`. Unknown ERC-20s won't appear. Use the
  `token` command for any specific contract.
- **Token names read from contract** — if a contract doesn't implement
  `name()` or `symbol()`, these fields may be empty. Known tokens have
  hardcoded labels as fallback.
- **Gas estimates are L2 only** — Base transaction costs include an L1
  data posting fee (depends on calldata size and L1 gas prices). The gas
  command estimates L2 execution cost only.
- **Whale detector scans latest block only** — not historical. Results
  vary by the moment you query. Default threshold is 1.0 ETH.
- **Proxy detection** — only EIP-1967 proxies are detected. Other proxy
  patterns (EIP-1167 minimal proxy, custom storage slots) are not checked.
- **Retry on 429** — both RPC and CoinGecko calls retry up to 2 times
  with exponential backoff on rate-limit errors.

---

## Verification

```bash
# Should print Base chain ID (8453), latest block, gas price, and ETH price
python3 ~/.hermes/skills/blockchain/base/scripts/base_client.py stats
```


---
## Component: codex-agents-main--plugins--blockchain-web3--skills--nft-standards

---
name: nft-standards
description: Implement NFT standards (ERC-721, ERC-1155) with proper metadata handling, minting strategies, and marketplace integration. Use when creating NFT contracts, building NFT marketplaces, or implementing digital asset systems.
---

# NFT Standards

Master ERC-721 and ERC-1155 NFT standards, metadata best practices, and advanced NFT features.

## When to Use This Skill

- Creating NFT collections (art, gaming, collectibles)
- Implementing marketplace functionality
- Building on-chain or off-chain metadata
- Creating soulbound tokens (non-transferable)
- Implementing royalties and revenue sharing
- Developing dynamic/evolving NFTs

## ERC-721 (Non-Fungible Token Standard)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 0.08 ether;
    uint256 public constant MAX_PER_MINT = 20;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(uint256 quantity) external payable {
        require(quantity > 0 && quantity <= MAX_PER_MINT, "Invalid quantity");
        require(_tokenIds.current() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= MINT_PRICE * quantity, "Insufficient payment");

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();
            _safeMint(msg.sender, newTokenId);
            _setTokenURI(newTokenId, generateTokenURI(newTokenId));
        }
    }

    function generateTokenURI(uint256 tokenId) internal pure returns (string memory) {
        // Return IPFS URI or on-chain metadata
        return string(abi.encodePacked("ipfs://QmHash/", Strings.toString(tokenId), ".json"));
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
```

## ERC-1155 (Multi-Token Standard)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameItems is ERC1155, Ownable {
    uint256 public constant SWORD = 1;
    uint256 public constant SHIELD = 2;
    uint256 public constant POTION = 3;

    mapping(uint256 => uint256) public tokenSupply;
    mapping(uint256 => uint256) public maxSupply;

    constructor() ERC1155("ipfs://QmBaseHash/{id}.json") {
        maxSupply[SWORD] = 1000;
        maxSupply[SHIELD] = 500;
        maxSupply[POTION] = 10000;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyOwner {
        require(tokenSupply[id] + amount <= maxSupply[id], "Exceeds max supply");

        _mint(to, id, amount, "");
        tokenSupply[id] += amount;
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyOwner {
        for (uint256 i = 0; i < ids.length; i++) {
            require(tokenSupply[ids[i]] + amounts[i] <= maxSupply[ids[i]], "Exceeds max supply");
            tokenSupply[ids[i]] += amounts[i];
        }

        _mintBatch(to, ids, amounts, "");
    }

    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Not authorized");
        _burn(from, id, amount);
        tokenSupply[id] -= amount;
    }
}
```

## Metadata Standards

### Off-Chain Metadata (IPFS)

```json
{
  "name": "NFT #1",
  "description": "Description of the NFT",
  "image": "ipfs://QmImageHash",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Power",
      "value": 95,
      "display_type": "number",
      "max_value": 100
    }
  ]
}
```

### On-Chain Metadata

```solidity
contract OnChainNFT is ERC721 {
    struct Traits {
        uint8 background;
        uint8 body;
        uint8 head;
        uint8 rarity;
    }

    mapping(uint256 => Traits) public tokenTraits;

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        Traits memory traits = tokenTraits[tokenId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "NFT #', Strings.toString(tokenId), '",',
                        '"description": "On-chain NFT",',
                        '"image": "data:image/svg+xml;base64,', generateSVG(traits), '",',
                        '"attributes": [',
                        '{"trait_type": "Background", "value": "', Strings.toString(traits.background), '"},',
                        '{"trait_type": "Rarity", "value": "', getRarityName(traits.rarity), '"}',
                        ']}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function generateSVG(Traits memory traits) internal pure returns (string memory) {
        // Generate SVG based on traits
        return "...";
    }
}
```

## Royalties (EIP-2981)

```solidity
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract NFTWithRoyalties is ERC721, IERC2981 {
    address public royaltyRecipient;
    uint96 public royaltyFee = 500; // 5%

    constructor() ERC721("Royalty NFT", "RNFT") {
        royaltyRecipient = msg.sender;
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (royaltyRecipient, (salePrice * royaltyFee) / 10000);
    }

    function setRoyalty(address recipient, uint96 fee) external onlyOwner {
        require(fee <= 1000, "Royalty fee too high"); // Max 10%
        royaltyRecipient = recipient;
        royaltyFee = fee;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId ||
               super.supportsInterface(interfaceId);
    }
}
```

## Soulbound Tokens (Non-Transferable)

```solidity
contract SoulboundToken is ERC721 {
    constructor() ERC721("Soulbound", "SBT") {}

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        require(from == address(0) || to == address(0), "Token is soulbound");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function mint(address to) external {
        uint256 tokenId = totalSupply() + 1;
        _safeMint(to, tokenId);
    }

    // Burn is allowed (user can destroy their SBT)
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _burn(tokenId);
    }
}
```

## Dynamic NFTs

```solidity
contract DynamicNFT is ERC721 {
    struct TokenState {
        uint256 level;
        uint256 experience;
        uint256 lastUpdated;
    }

    mapping(uint256 => TokenState) public tokenStates;

    function gainExperience(uint256 tokenId, uint256 exp) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        TokenState storage state = tokenStates[tokenId];
        state.experience += exp;

        // Level up logic
        if (state.experience >= state.level * 100) {
            state.level++;
        }

        state.lastUpdated = block.timestamp;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        TokenState memory state = tokenStates[tokenId];

        // Generate metadata based on current state
        return generateMetadata(tokenId, state);
    }

    function generateMetadata(uint256 tokenId, TokenState memory state)
        internal
        pure
        returns (string memory)
    {
        // Dynamic metadata generation
        return "";
    }
}
```

## Gas-Optimized Minting (ERC721A)

```solidity
import "erc721a/contracts/ERC721A.sol";

contract OptimizedNFT is ERC721A {
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 0.05 ether;

    constructor() ERC721A("Optimized NFT", "ONFT") {}

    function mint(uint256 quantity) external payable {
        require(_totalMinted() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value >= MINT_PRICE * quantity, "Insufficient payment");

        _mint(msg.sender, quantity);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmBaseHash/";
    }
}
```


---
## Component: codex-hermes-agent-main--optional-skills--blockchain--solana

---
name: solana
description: Query Solana blockchain data with USD pricing — wallet balances, token portfolios with values, transaction details, NFTs, whale detection, and live network stats. Uses Solana RPC + CoinGecko. No API key required.
version: 0.2.0
author: Deniz Alagoz (gizdusum), enhanced by Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [Solana, Blockchain, Crypto, Web3, RPC, DeFi, NFT]
    related_skills: []
---

# Solana Blockchain Skill

Query Solana on-chain data enriched with USD pricing via CoinGecko.
8 commands: wallet portfolio, token info, transactions, activity, NFTs,
whale detection, network stats, and price lookup.

No API key needed. Uses only Python standard library (urllib, json, argparse).

---

## When to Use

- User asks for a Solana wallet balance, token holdings, or portfolio value
- User wants to inspect a specific transaction by signature
- User wants SPL token metadata, price, supply, or top holders
- User wants recent transaction history for an address
- User wants NFTs owned by a wallet
- User wants to find large SOL transfers (whale detection)
- User wants Solana network health, TPS, epoch, or SOL price
- User asks "what's the price of BONK/JUP/SOL?"

---

## Prerequisites

The helper script uses only Python standard library (urllib, json, argparse).
No external packages required.

Pricing data comes from CoinGecko's free API (no key needed, rate-limited
to ~10-30 requests/minute). For faster lookups, use `--no-prices` flag.

---

## Quick Reference

RPC endpoint (default): https://api.mainnet-beta.solana.com
Override: export SOLANA_RPC_URL=https://your-private-rpc.com

Helper script path: ~/.hermes/skills/blockchain/solana/scripts/solana_client.py

```
python3 solana_client.py wallet   <address> [--limit N] [--all] [--no-prices]
python3 solana_client.py tx       <signature>
python3 solana_client.py token    <mint_address>
python3 solana_client.py activity <address> [--limit N]
python3 solana_client.py nft      <address>
python3 solana_client.py whales   [--min-sol N]
python3 solana_client.py stats
python3 solana_client.py price    <mint_or_symbol>
```

---

## Procedure

### 0. Setup Check

```bash
python3 --version

# Optional: set a private RPC for better rate limits
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Confirm connectivity
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```

### 1. Wallet Portfolio

Get SOL balance, SPL token holdings with USD values, NFT count, and
portfolio total. Tokens sorted by value, dust filtered, known tokens
labeled by name (BONK, JUP, USDC, etc.).

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

Flags:
- `--limit N` — show top N tokens (default: 20)
- `--all` — show all tokens, no dust filter, no limit
- `--no-prices` — skip CoinGecko price lookups (faster, RPC-only)

Output includes: SOL balance + USD value, token list with prices sorted
by value, dust count, NFT summary, total portfolio value in USD.

### 2. Transaction Details

Inspect a full transaction by its base58 signature. Shows balance changes
in both SOL and USD.

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  tx 5j7s8K...your_signature_here
```

Output: slot, timestamp, fee, status, balance changes (SOL + USD),
program invocations.

### 3. Token Info

Get SPL token metadata, current price, market cap, supply, decimals,
mint/freeze authorities, and top 5 holders.

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  token DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

Output: name, symbol, decimals, supply, price, market cap, top 5
holders with percentages.

### 4. Recent Activity

List recent transactions for an address (default: last 10, max: 25).

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  activity 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM --limit 25
```

### 5. NFT Portfolio

List NFTs owned by a wallet (heuristic: SPL tokens with amount=1, decimals=0).

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  nft 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

Note: Compressed NFTs (cNFTs) are not detected by this heuristic.

### 6. Whale Detector

Scan the most recent block for large SOL transfers with USD values.

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py \
  whales --min-sol 500
```

Note: scans the latest block only — point-in-time snapshot, not historical.

### 7. Network Stats

Live Solana network health: current slot, epoch, TPS, supply, validator
version, SOL price, and market cap.

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```

### 8. Price Lookup

Quick price check for any token by mint address or known symbol.

```bash
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price BONK
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price JUP
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price SOL
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py price DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
```

Known symbols: SOL, USDC, USDT, BONK, JUP, WETH, JTO, mSOL, stSOL,
PYTH, HNT, RNDR, WEN, W, TNSR, DRIFT, bSOL, JLP, WIF, MEW, BOME, PENGU.

---

## Pitfalls

- **CoinGecko rate-limits** — free tier allows ~10-30 requests/minute.
  Price lookups use 1 request per token. Wallets with many tokens may
  not get prices for all of them. Use `--no-prices` for speed.
- **Public RPC rate-limits** — Solana mainnet public RPC limits requests.
  For production use, set SOLANA_RPC_URL to a private endpoint
  (Helius, QuickNode, Triton).
- **NFT detection is heuristic** — amount=1 + decimals=0. Compressed
  NFTs (cNFTs) and Token-2022 NFTs won't appear.
- **Whale detector scans latest block only** — not historical. Results
  vary by the moment you query.
- **Transaction history** — public RPC keeps ~2 days. Older transactions
  may not be available.
- **Token names** — ~25 well-known tokens are labeled by name. Others
  show abbreviated mint addresses. Use the `token` command for full info.
- **Retry on 429** — both RPC and CoinGecko calls retry up to 2 times
  with exponential backoff on rate-limit errors.

---

## Verification

```bash
# Should print current Solana slot, TPS, and SOL price
python3 ~/.hermes/skills/blockchain/solana/scripts/solana_client.py stats
```


---
## Component: codex-agents-main--plugins--blockchain-web3--skills--defi-protocol-templates

---
name: defi-protocol-templates
description: Implement DeFi protocols with production-ready templates for staking, AMMs, governance, and lending systems. Use when building decentralized finance applications or smart contract protocols.
---

# DeFi Protocol Templates

Production-ready templates for common DeFi protocols including staking, AMMs, governance, lending, and flash loans.

## When to Use This Skill

- Building staking platforms with reward distribution
- Implementing AMM (Automated Market Maker) protocols
- Creating governance token systems
- Developing lending/borrowing protocols
- Integrating flash loan functionality
- Launching yield farming platforms

## Staking Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingRewards is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    IERC20 public rewardsToken;

    uint256 public rewardRate = 100; // Rewards per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;

    uint256 private _totalSupply;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken, address _rewardsToken) {
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored +
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / _totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (balances[account] *
            (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 +
            rewards[account];
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }
}
```

## AMM (Automated Market Maker)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleAMM {
    IERC20 public token0;
    IERC20 public token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event Swap(address indexed trader, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out);

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 shares) {
        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        if (totalSupply == 0) {
            shares = sqrt(amount0 * amount1);
        } else {
            shares = min(
                (amount0 * totalSupply) / reserve0,
                (amount1 * totalSupply) / reserve1
            );
        }

        require(shares > 0, "Shares = 0");
        _mint(msg.sender, shares);
        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );

        emit Mint(msg.sender, shares);
    }

    function removeLiquidity(uint256 shares) external returns (uint256 amount0, uint256 amount1) {
        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));

        amount0 = (shares * bal0) / totalSupply;
        amount1 = (shares * bal1) / totalSupply;

        require(amount0 > 0 && amount1 > 0, "Amount0 or amount1 = 0");

        _burn(msg.sender, shares);
        _update(bal0 - amount0, bal1 - amount1);

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);

        emit Burn(msg.sender, shares);
    }

    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        require(tokenIn == address(token0) || tokenIn == address(token1), "Invalid token");

        bool isToken0 = tokenIn == address(token0);
        (IERC20 tokenIn_, IERC20 tokenOut, uint256 resIn, uint256 resOut) = isToken0
            ? (token0, token1, reserve0, reserve1)
            : (token1, token0, reserve1, reserve0);

        tokenIn_.transferFrom(msg.sender, address(this), amountIn);

        // 0.3% fee
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        amountOut = (resOut * amountInWithFee) / (resIn + amountInWithFee);

        tokenOut.transfer(msg.sender, amountOut);

        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );

        emit Swap(msg.sender, isToken0 ? amountIn : 0, isToken0 ? 0 : amountIn, isToken0 ? 0 : amountOut, isToken0 ? amountOut : 0);
    }

    function _mint(address to, uint256 amount) private {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function _burn(address from, uint256 amount) private {
        balanceOf[from] -= amount;
        totalSupply -= amount;
    }

    function _update(uint256 res0, uint256 res1) private {
        reserve0 = res0;
        reserve1 = res1;
    }

    function sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}
```

## Governance Token

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20Votes, Ownable {
    constructor() ERC20("Governance Token", "GOV") ERC20Permit("Governance Token") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
}

contract Governor is Ownable {
    GovernanceToken public governanceToken;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    uint256 public votingPeriod = 17280; // ~3 days in blocks
    uint256 public proposalThreshold = 100000 * 10**18;

    event ProposalCreated(uint256 indexed proposalId, address proposer, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _governanceToken) {
        governanceToken = GovernanceToken(_governanceToken);
    }

    function propose(string memory description) external returns (uint256) {
        require(
            governanceToken.getPastVotes(msg.sender, block.number - 1) >= proposalThreshold,
            "Proposer votes below threshold"
        );

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.startBlock = block.number;
        newProposal.endBlock = block.number + votingPeriod;

        emit ProposalCreated(proposalCount, msg.sender, description);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.number >= proposal.startBlock, "Voting not started");
        require(block.number <= proposal.endBlock, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = governanceToken.getPastVotes(msg.sender, proposal.startBlock);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.number > proposal.endBlock, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal failed");

        proposal.executed = true;

        // Execute proposal logic here

        emit ProposalExecuted(proposalId);
    }
}
```

## Flash Loan

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external returns (bool);
}

contract FlashLoanProvider {
    IERC20 public token;
    uint256 public feePercentage = 9; // 0.09% fee

    event FlashLoan(address indexed borrower, uint256 amount, uint256 fee);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function flashLoan(
        address receiver,
        uint256 amount,
        bytes calldata params
    ) external {
        uint256 balanceBefore = token.balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient liquidity");

        uint256 fee = (amount * feePercentage) / 10000;

        // Send tokens to receiver
        token.transfer(receiver, amount);

        // Execute callback
        require(
            IFlashLoanReceiver(receiver).executeOperation(
                address(token),
                amount,
                fee,
                params
            ),
            "Flash loan failed"
        );

        // Verify repayment
        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "Flash loan not repaid");

        emit FlashLoan(receiver, amount, fee);
    }
}

// Example flash loan receiver
contract FlashLoanReceiver is IFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external override returns (bool) {
        // Decode params and execute arbitrage, liquidation, etc.
        // ...

        // Approve repayment
        IERC20(asset).approve(msg.sender, amount + fee);

        return true;
    }
}
```


---
