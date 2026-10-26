# custom API design, smart contract pattern, and architectural layout.
## Architecture & The .env Configuration
Your Next.js server handles verification and dynamically fetches your target settlement addresses from the environment. This ensures your front-end code never leaks private configurations or static wallet keys.
Create or update your .env.local file in your Next.js root:

# Telegram Bot Configuration for Authentication
TELEGRAM_BOT_TOKEN="7182938192:AAH_ExampleTokenHere_YourBotToken"
# Merchant Settlement Addresses (The Destination Wallets)# TON Protocol (Supports native Telegram Wallet USDT-TON)
NEXT_PUBLIC_MERCHANT_TON_ADDRESS="UQAl...Your_TON_Wallet_Address"
# EVM Layer 2 Settlement Wallet (For USDC/USDT on Base, Arbitrum, or Polygon)
NEXT_PUBLIC_MERCHANT_EVM_ADDRESS="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
# Infura / Alchemy RPC Gateways for On-Chain Transaction Verification
EVM_RPC_URL="https://base.org" 
TON_RPC_URL="https://toncenter.com"
TON_CENTER_API_KEY="your_toncenter_api_key_here"

------------------------------
## Telegram Auth-Based Website Access (Next.js API Route)
When users open extfx.com/dashboard inside Telegram (as a Mini App) or click "Login with Telegram" on mobile, Telegram passes an authentication payload (initData or a widget auth object) containing a cryptographic hash. Your backend must verify this hash using your TELEGRAM_BOT_TOKEN.
Create a secure validation route at src/app/api/auth/telegram/route.ts:

import { NextResponse } from 'next/server';import crypto from 'crypto';
export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    
    // 1. Parse the query string parameters from Telegram
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // 2. Sort the remaining parameters alphabetically
    const params = Array.from(urlParams.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort();

    const dataCheckString = params.join('\n');

    // 3. Generate the secret key using the bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 4. Calculate the hash to compare against Telegram's payload
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Hash Signature' }, { status: 401 });
    }

    // Extraction of valid user object safely
    const userString = urlParams.get('user');
    const user = userString ? JSON.parse(userString) : null;

    // Generate your own Session JWT or HttpOnly Cookie for the ExtFx Dashboard here
    return NextResponse.json({ success: true, user });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal Authentication Error' }, { status: 500 });
  }
}

------------------------------
## TON Smart Contract Framework & Jetton Payment Engine
To receive USDT on the TON Network natively inside Telegram, your application interface directly calls the user's active wallet connection (@tonconnect/sdk).
Because TON treats stablecoins as Jettons, transferring USDT means sending a deployment payload to the user's local Jetton wallet, instructing it to transfer the tokens directly to your .env configured NEXT_PUBLIC_MERCHANT_TON_ADDRESS.
## Next.js React Frontend Component (src/components/TonCheckout.tsx)

'use client';import { useTonConnectUI, toUserFriendlyAddress } from '@tonconnect/ui-react';import { beginCell, Address } from '@ton/ton';
export function TonCheckout({ amountUsdt, orderId }: { amountUsdt: number; orderId: string }) {
  const [tonConnectUI] = useTonConnectUI();

  const handlePayment = async () => {
    if (!tonConnectUI.connected) {
      alert('Please connect your Telegram/TON Wallet first.');
      return;
    }

    const merchantAddressString = process.env.NEXT_PUBLIC_MERCHANT_TON_ADDRESS!;
    const merchantAddress = Address.parse(merchantAddressString);
    
    // Scale amount to 6 decimals (Standard USDT Jetton factor)
    const jettonAmount = BigInt(amountUsdt * 1_000_000); 

    // Encode the internal comment payload containing ExtFx order reference for accounting tracking
    const forwardPayload = beginCell()
      .storeUint(0, 32) // Text comment prefix
      .storeBuffer(Buffer.from(`ExtFx_Order_${orderId}`, 'utf-8'))
      .endCell();

    // Construct the standard Jetton transfer body
    const body = beginCell()
      .storeUint(0xf8a7ea5, 32)      // Op-code for Jetton transfer
      .storeUint(0, 64)             // Query ID
      .storeCoins(jettonAmount)     // Amount to send
      .storeAddress(merchantAddress) // Destination wallet
      .storeAddress(merchantAddress) // Excesses address routing
      .storeBit(0)                  // No custom payload
      .storeCoins(BigInt(50000000)) // Forward TON gas (0.05 TON)
      .storeBit(1)                  // We have a forward payload
      .storeRef(forwardPayload)
      .endCell();

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360, // 6-minute window
      messages: [
        {
          // The sender must interact directly with the native Mainnet USDT Jetton Master Wallet contract
          address: 'EQCxE6mUt4gCH8DY7Bebvqa9AtIZJbZ860En9Ju59YcYscjA', 
          amount: '100000000'.toString(), // 0.1 TON boundary deployment allocation for fees
          payload: body.toBoc().toString('base64'),
        },
      ],
    };

    try {
      const result = await tonConnectUI.sendTransaction(transaction);
      // Pass the cryptographic execution proof back to your internal Next.js API for backend verification
      await fetch('/api/payments/verify-ton', {
        method: 'POST',
        body: JSON.stringify({ boc: result.boc, orderId }),
      });
      alert('Payment transmitted to network successfully!');
    } catch (e) {
      console.error('Payment rejected or timed out', e);
    }
  };

  return (
    <button onClick={handlePayment} className="bg-blue-600 px-6 py-3 rounded-lg text-white font-bold">
      Pay ${amountUsdt} via Telegram Wallet (USDT)
    </button>
  );
}

------------------------------
## EVM Custom API Payment Rail (Base / Arbitrum Layer 2)
For clients paying via standard web3 browsers or mobile apps connected to EVM chains, your system handles stablecoin transfer intents via a native Transfer execution to the ERC-20 contract.
## Next.js API Verification Webhook (src/app/api/payments/verify-evm/route.ts)
Once your client UI calls the smart contract and receives a transaction hash, your Next.js API securely verifies the execution logs on-chain via RPC to ensure the transaction isn't spoofed.

import { NextResponse } from 'next/server';import { ethers } from 'ethers';
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
export async function POST(request: Request) {
  try {
    const { txHash, orderId, expectedAmount } = await request.json();
    
    // Connect strictly to your high-performance RPC Node configurations
    const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL);
    const txReceipt = await provider.getTransactionReceipt(txHash);

    if (!txReceipt || txReceipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction unconfirmed or failed' }, { status: 400 });
    }

    const iface = new ethers.Interface(ERC20_ABI);
    let verifiedPaymentSuccess = false;

    // Audit logs inside the transaction to verify genuine funds reached your specific merchant wallet
    for (const log of txReceipt.logs) {
      try {
        const parsedLog = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsedLog && parsedLog.name === 'Transfer') {
          const toAddress = parsedLog.args.to.toLowerCase();

const merchantAddress = process.env.NEXT_PUBLIC_MERCHANT_EVM_ADDRESS!.toLowerCase();
// Verify currency scale matches 6-decimal stablecoins (USDC / USDT)
const receivedAmount = Number(ethers.formatUnits(parsedLog.args.value, 6));
if (toAddress === merchantAddress && receivedAmount >= expectedAmount) {
verifiedPaymentSuccess = true;
break;
}
}
} catch {
continue; // Log did not match target ERC20 format interface, proceed parsing
}
}
if (verifiedPaymentSuccess) {
// Execute database mutation to credit ExtFx dashboard user balance for this orderId
return NextResponse.json({ success: true, message: 'Balance loaded successfully' });
}
return NextResponse.json({ error: 'Payment data mismatch' }, { status: 400 });
} catch (error) {
return NextResponse.json({ error: 'Verification pipeline error' }, { status: 500 });
}
}

### Continuous Checkout Updates & Push Notifications
To achieve real-time payment states on `extfx.com/dashboard` without forcing manual page refreshes:
1.  **Frontend Pooling / Webhooks:** Utilize a reactive query hook (e.g., `useSWR` or `TanStack Query`) configured to pull the order status from `/api/orders/[id]` every 4 seconds once the user initiates payment.
2.  **Telegram Bot Alerting Integration:** Upon successful database confirmation inside your Next.js API, trigger a server-side programmatic notice back to the customer's Telegram interface:
    ```typescript
    await fetch(`https://telegram.org{process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramUserId,
        text:  *ExtFx Payment Confirmed!*\nOrder Ref: #${orderId}\nYour custom dashboard balance has been fully updated in real-time.`,
        parse_mode: 'Markdown',
      }),
    });
    ```

