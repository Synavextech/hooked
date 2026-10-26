import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../App';
import Navigation from '../components/Navigation';
import { 
  Coins, Crown, CreditCard, Smartphone, Check, AlertCircle, Sparkles, 
  CheckCircle2, Clock, History, ExternalLink, RefreshCw, Copy, QrCode,
  FileText, Printer, X, Loader2, Send, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, Address } from '@ton/ton';

interface Package {
  id: 'premium' | 'tokens_50' | 'tokens_150';
  name: string;
  price: string;
  kesPrice: string;
  description: string;
  tokens: number;
}

interface PaymentRecord {
  id: string;
  provider: 'stripe' | 'paypal' | 'mpesa' | 'crypto';
  package_type: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  provider_transaction_id?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

const PACKAGES: Package[] = [
  {
    id: 'premium',
    name: 'Hooked Premium',
    price: '$19.99',
    kesPrice: 'KES 2,000',
    description: 'Unlock unlimited connection requests and inspect all user lifestyle details & galleries.',
    tokens: 0
  },
  {
    id: 'tokens_50',
    name: '50 Token Credits',
    price: '$9.99',
    kesPrice: 'KES 1,000',
    description: 'Use token credits for custom profile boosts and highlighted discovery.',
    tokens: 50
  },
  {
    id: 'tokens_150',
    name: '150 Token Credits',
    price: '$24.99',
    kesPrice: 'KES 2,500',
    description: 'Best value package for active matching and priority queue placement.',
    tokens: 150
  }
];

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [selectedPkg, setSelectedPkg] = useState<Package>(PACKAGES[0]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'mpesa' | 'crypto'>('card');
  
  // Telegram & Crypto Gateway Config & State
  const [paypalClientId, setPaypalClientId] = useState<string>('');
  const [merchantTonAddress, setMerchantTonAddress] = useState<string>('');
  const [merchantEvmAddress, setMerchantEvmAddress] = useState<string>('');
  const [selectedCryptoRail, setSelectedCryptoRail] = useState<'ton' | 'evm'>('ton');
  const [evmTxHash, setEvmTxHash] = useState('');
  const [verifyingEvm, setVerifyingEvm] = useState(false);
  const [payingTon, setPayingTon] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // TonConnect hooks
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();

  // M-Pesa state & polling
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaPolling, setMpesaPolling] = useState(false);
  const [mpesaSuccess, setMpesaSuccess] = useState<string | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  // General Status
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment History
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  const getReceiptNumber = (record: PaymentRecord) => {
    if (record.provider === 'mpesa') {
      try {
        const meta = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata;
        if (meta?.receipt) return meta.receipt;
      } catch (e) {}
    }
    return record.provider_transaction_id || record.id.slice(0, 18).toUpperCase();
  };

  // Fetch Public Config and Transaction History
  useEffect(() => {
    // Check Stripe query param redirect status
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      setStatusMsg('Stripe payment completed successfully! Your account has been upgraded.');
      refreshUser();
      fetchHistory();
    } else if (status === 'cancel') {
      setErrorMsg('Stripe checkout was cancelled.');
    }

    // Fetch dynamic payment gateway config
    axios.get('/api/payments/config')
      .then((res) => {
        if (res.data?.paypalClientId) {
          setPaypalClientId(res.data.paypalClientId);
        }
        if (res.data?.merchantTonAddress) {
          setMerchantTonAddress(res.data.merchantTonAddress);
        }
        if (res.data?.merchantEvmAddress) {
          setMerchantEvmAddress(res.data.merchantEvmAddress);
        }
      })
      .catch((err) => console.warn('Config fetch warning:', err.message));

    fetchHistory();

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get('/api/payments/history');
      setHistory(res.data.payments || []);
    } catch (err) {
      console.warn('History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Dynamically load PayPal SDK when client ID is available and PayPal is selected
  useEffect(() => {
    if (!paypalClientId || paymentMethod !== 'paypal') return;

    const scriptId = 'paypal-sdk-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
      script.async = true;
      script.onload = () => initPayPalButtons();
      document.body.appendChild(script);
    } else {
      initPayPalButtons();
    }
  }, [paypalClientId, selectedPkg, paymentMethod]);

  const initPayPalButtons = () => {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    container.innerHTML = '';

    if ((window as any).paypal) {
      (window as any).paypal.Buttons({
        createOrder: async () => {
          setErrorMsg(null);
          try {
            const res = await axios.post('/api/payments/paypal/create-order', { type: selectedPkg.id });
            return res.data.id;
          } catch (err: any) {
            setErrorMsg('Failed to initialize PayPal order.');
            throw err;
          }
        },
        onApprove: async (data: any) => {
          try {
            const res = await axios.post('/api/payments/paypal/capture-order', { orderId: data.orderID });
            if (res.data.status === 'success') {
              setStatusMsg('PayPal purchase completed and verified successfully!');
              refreshUser();
              fetchHistory();
            }
          } catch (err) {
            setErrorMsg('Failed to capture PayPal payment.');
          }
        },
        onError: (err: any) => {
          console.error(err);
          setErrorMsg('PayPal encountered an error. Please check your account.');
        }
      }).render('#paypal-button-container');
    }
  };

  // Stripe Checkout Session Redirect
  const handleStripeCheckout = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await axios.post('/api/payments/stripe/create-checkout-session', { type: selectedPkg.id });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setErrorMsg('Stripe checkout initialization failed.');
    }
  };

  // M-Pesa STK Push with Live Polling
  const handleMpesaSTKPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaPhone.trim()) return;

    setErrorMsg(null);
    setMpesaSuccess(null);
    setMpesaLoading(true);

    try {
      const res = await axios.post('/api/payments/mpesa/stkpush', {
        phone: mpesaPhone,
        type: selectedPkg.id
      });

      const checkoutRequestId = res.data.checkoutRequestId;
      setMpesaSuccess('STK Push sent to your phone! Please enter your M-Pesa PIN...');
      setMpesaPhone('');
      setMpesaLoading(false);

      if (checkoutRequestId) {
        startMpesaPolling(checkoutRequestId);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'M-Pesa STK Push failed to initiate.');
      setMpesaLoading(false);
    }
  };

  // Poll M-Pesa payment status automatically
  const startMpesaPolling = (checkoutRequestId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setMpesaPolling(true);

    let attempts = 0;
    const maxAttempts = 20; // 20 * 3s = 60 seconds

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const statusRes = await axios.get(`/api/payments/mpesa/status/${checkoutRequestId}`);
        if (statusRes.data?.status === 'completed') {
          clearInterval(pollingIntervalRef.current);
          setMpesaPolling(false);
          setMpesaSuccess('M-Pesa payment verified successfully! Your account has been credited.');
          refreshUser();
          fetchHistory();
        } else if (statusRes.data?.status === 'failed') {
          clearInterval(pollingIntervalRef.current);
          setMpesaPolling(false);
          setErrorMsg('M-Pesa payment was rejected or timed out.');
        }
      } catch (err) {
        console.warn('M-Pesa poll sync:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollingIntervalRef.current);
        setMpesaPolling(false);
        if (!statusMsg) {
          setMpesaSuccess('Payment is processing. Your balance will update automatically shortly.');
        }
      }
    }, 3000);
  };

  const copyAddressToClipboard = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Automated TON Jetton / Telegram Wallet Payment Handler
  const handleTonPayment = async () => {
    try {
      setPayingTon(true);
      setErrorMsg(null);
      setStatusMsg(null);

      if (!tonConnectUI.connected) {
        await tonConnectUI.openModal();
        setPayingTon(false);
        return;
      }

      const destTonAddress = merchantTonAddress || (import.meta as any).env.VITE_MERCHANT_TON_ADDRESS || 'UQAl_Example_Merchant_TON_Wallet_Address';
      let parsedMerchantAddress: any;
      try {
        parsedMerchantAddress = Address.parse(destTonAddress);
      } catch (e) {
        setErrorMsg('Invalid or unconfigured merchant TON address. Please verify .env settings.');
        setPayingTon(false);
        return;
      }

      const numAmount = selectedPkg.id === 'tokens_50' ? 9.99 : selectedPkg.id === 'tokens_150' ? 24.99 : 19.99;
      const jettonAmount = BigInt(Math.round(numAmount * 1_000_000));
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Encode forward comment payload
      const forwardPayload = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`Hooked_Order_${orderId}`)
        .endCell();

      // Standard Jetton transfer body
      const body = beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(jettonAmount)
        .storeAddress(parsedMerchantAddress)
        .storeAddress(parsedMerchantAddress)
        .storeBit(0)
        .storeCoins(BigInt(50000000)) // 0.05 TON forward gas
        .storeBit(1)
        .storeRef(forwardPayload)
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            // Mainnet native USDT Jetton Master Wallet contract
            address: 'EQCxE6mUt4gCH8DY7Bebvqa9AtIZJbZ860En9Ju59YcYscjA',
            amount: '100000000', // 0.1 TON boundary deployment allocation for fees
            payload: body.toBoc().toString('base64'),
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);

      // Submit cryptographic proof to server verification endpoint
      const verifyRes = await axios.post('/api/payments/verify-ton', {
        boc: result.boc,
        orderId,
        packageType: selectedPkg.id,
        amount: numAmount,
      });

      setStatusMsg(verifyRes.data.message || 'Payment confirmed via Telegram Wallet (USDT)!');
      await refreshUser();
      fetchHistory();
    } catch (err: any) {
      console.error('TON payment error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Payment rejected or cancelled by wallet');
    } finally {
      setPayingTon(false);
    }
  };

  // Automated On-chain EVM Verification Handler
  const handleEvmVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!evmTxHash.trim()) {
      setErrorMsg('Please enter your transaction hash (TxID).');
      return;
    }

    setVerifyingEvm(true);
    setErrorMsg(null);
    setStatusMsg(null);

    const numAmount = selectedPkg.id === 'tokens_50' ? 9.99 : selectedPkg.id === 'tokens_150' ? 24.99 : 19.99;
    const orderId = `evm_${Date.now()}`;

    try {
      const res = await axios.post('/api/payments/verify-evm', {
        txHash: evmTxHash.trim(),
        orderId,
        expectedAmount: numAmount,
        packageType: selectedPkg.id,
      });

      setStatusMsg(res.data.message || 'On-chain payment verified successfully!');
      setEvmTxHash('');
      await refreshUser();
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to verify transaction on-chain. Please check your transaction hash and network.');
    } finally {
      setVerifyingEvm(false);
    }
  };

  // Web3 Browser Wallet One-Click Handler (Base L2)
  const handleWeb3Pay = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setErrorMsg('No Ethereum/EVM browser wallet detected. Transfer to the settlement address and paste your TxID below to verify.');
      return;
    }
    try {
      setVerifyingEvm(true);
      setErrorMsg(null);
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      const dest = merchantEvmAddress || (import.meta as any).env.VITE_MERCHANT_EVM_ADDRESS;
      if (!dest) {
        setErrorMsg('Merchant EVM address not configured.');
        setVerifyingEvm(false);
        return;
      }

      const numAmount = selectedPkg.id === 'tokens_50' ? 9.99 : selectedPkg.id === 'tokens_150' ? 24.99 : 19.99;
      const rawUnits = BigInt(Math.round(numAmount * 1_000_000)).toString(16).padStart(64, '0');
      const cleanTo = dest.replace('0x', '').padStart(64, '0');
      const data = '0xa9059cbb' + cleanTo + rawUnits; // ERC20 transfer(address,uint256)

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC contract
            data,
          },
        ],
      });

      setEvmTxHash(txHash);
      const res = await axios.post('/api/payments/verify-evm', {
        txHash,
        orderId: `web3_${Date.now()}`,
        expectedAmount: numAmount,
        packageType: selectedPkg.id,
      });

      setStatusMsg(res.data.message || 'On-chain payment verified successfully!');
      await refreshUser();
      fetchHistory();
    } catch (err: any) {
      console.error('Web3 payment error:', err);
      setErrorMsg(err.message || 'Web3 transaction was rejected or failed.');
    } finally {
      setVerifyingEvm(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-28">
      <Navigation />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="border-b border-zinc-900 pb-4">
          <h1 className="text-2xl font-black text-white">Wallet & Upgrades</h1>
          <p className="text-xs text-zinc-500 font-light">Manage your token credits and premium matchmaking access.</p>
        </div>

        {/* Current State Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          
          {/* Tokens card */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-6 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Token Balance</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{user?.token_balance || 0}</span>
                <span className="text-xs text-zinc-400">Tokens</span>
              </div>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-500">
              <Coins className="h-7 w-7" />
            </div>
          </div>

          {/* Premium Status Card */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-6 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Premium Access</span>
              <div>
                {user?.is_premium ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="h-3 w-3" /> Active Unlimited
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-500">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
              <Crown className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* PACKAGE SELECTOR */}
        <div className="space-y-3 text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">1. Select Package</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {PACKAGES.map((pkg) => {
              const isSelected = selectedPkg.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg)}
                  className={`rounded-2xl border p-4 text-left space-y-3 transition-all duration-200 ${
                    isSelected 
                      ? 'border-rose-500 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
                      : 'border-zinc-900 bg-zinc-950 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white leading-none">{pkg.name}</span>
                    {isSelected && (
                      <div className="h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center text-white">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-light leading-normal">{pkg.description}</p>
                  <div>
                    <span className="block text-sm font-black text-white">{pkg.price}</span>
                    <span className="block text-[10px] text-zinc-500 font-medium">{pkg.kesPrice}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PAYMENT METHOD SELECTOR */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">2. Select Payment Method</h3>
          
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {/* Card (Stripe) */}
            <button
              onClick={() => setPaymentMethod('card')}
              className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'card' 
                  ? 'border-rose-500 bg-rose-500/10 text-white shadow-sm' 
                  : 'border-zinc-900 text-zinc-400 hover:text-zinc-200 bg-zinc-950'
              }`}
            >
              <CreditCard className="h-5 w-5 text-rose-400" />
              <span className="text-[10px] font-bold">Credit Card (Stripe)</span>
            </button>

            {/* PayPal */}
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'paypal' 
                  ? 'border-rose-500 bg-rose-500/10 text-white shadow-sm' 
                  : 'border-zinc-900 text-zinc-400 hover:text-zinc-200 bg-zinc-950'
              }`}
            >
              <Coins className="h-5 w-5 text-blue-400" />
              <span className="text-[10px] font-bold">PayPal</span>
            </button>

            {/* M-Pesa */}
            <button
              onClick={() => setPaymentMethod('mpesa')}
              className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'mpesa' 
                  ? 'border-rose-500 bg-rose-500/10 text-white shadow-sm' 
                  : 'border-zinc-900 text-zinc-400 hover:text-zinc-200 bg-zinc-950'
              }`}
            >
              <Smartphone className="h-5 w-5 text-emerald-400" />
              <span className="text-[10px] font-bold">M-Pesa STK</span>
            </button>

            {/* Telegram & Crypto */}
            <button
              onClick={() => setPaymentMethod('crypto')}
              className={`rounded-xl border p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'crypto' 
                  ? 'border-sky-500 bg-sky-500/10 text-white shadow-sm' 
                  : 'border-zinc-900 text-zinc-400 hover:text-zinc-200 bg-zinc-950'
              }`}
            >
              <Coins className="h-5 w-5 text-sky-400" />
              <span className="text-[10px] font-bold">Telegram / Crypto Pay</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-6 shadow-xl">
            
            {paymentMethod === 'card' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-zinc-400 font-light">
                  Upgrade your account securely using card payments handled by Stripe hosted checkout.
                </p>
                <button
                  onClick={handleStripeCheckout}
                  className="w-full rounded-xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Pay {selectedPkg.price} with Card
                </button>
              </div>
            )}

            {paymentMethod === 'paypal' && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-zinc-400 font-light">
                  Complete your transaction securely using PayPal order checkout.
                </p>
                <div id="paypal-button-container" className="mx-auto max-w-[280px]"></div>
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <form onSubmit={handleMpesaSTKPush} className="space-y-4 text-left">
                <p className="text-xs text-zinc-400 font-light text-center">
                  Enter your Safaricom phone number below. We will send an instant STK Push prompt to your phone ({selectedPkg.kesPrice}).
                </p>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Safaricom Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="254712345678"
                    className="w-full rounded-xl bg-black border border-zinc-900 py-2.5 px-4 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mpesaLoading || mpesaPolling}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {mpesaLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : mpesaPolling ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Verifying PIN Prompt...</span>
                    </div>
                  ) : (
                    <span>Request M-Pesa STK Push ({selectedPkg.kesPrice})</span>
                  )}
                </button>

                {mpesaSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    <span>{mpesaSuccess}</span>
                  </div>
                )}
              </form>
            )}

            {paymentMethod === 'crypto' && (
              <div className="space-y-5 text-left">
                {/* Crypto Rails Switcher */}
                <div className="flex rounded-xl bg-black p-1 border border-zinc-900 gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCryptoRail('ton')}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedCryptoRail === 'ton' ? 'bg-sky-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Telegram Wallet (USDT-TON)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCryptoRail('evm')}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedCryptoRail === 'evm' ? 'bg-sky-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Base / EVM L2 (USDC/USDT)</span>
                  </button>
                </div>

                {/* RAIL 1: Telegram Wallet / TON */}
                {selectedCryptoRail === 'ton' && (
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                          TON Jetton Settlement Engine
                        </span>
                        {tonWallet ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Not Connected</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 font-light leading-relaxed">
                        Execute seamless instant settlement via Telegram Wallet or Tonkeeper. USDT is transferred on the TON network with native cryptographic proof.
                      </p>
                    </div>

                    {tonWallet ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-black border border-zinc-800 p-3 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Active Wallet</span>
                            <span className="font-mono text-zinc-300 text-[11px]">
                              {tonWallet.account.address.slice(0, 8)}...{tonWallet.account.address.slice(-6)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => tonConnectUI.disconnect()}
                            className="text-[10px] text-rose-400 hover:text-rose-300"
                          >
                            Disconnect
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleTonPayment}
                          disabled={payingTon}
                          className="w-full rounded-xl bg-sky-500 py-3 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
                        >
                          {payingTon ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Confirming via Telegram Wallet...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Pay {selectedPkg.price} via Telegram Wallet (USDT)</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => tonConnectUI.openModal()}
                        className="w-full rounded-xl bg-sky-500 py-3 text-xs font-bold text-white hover:bg-sky-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
                      >
                        <Send className="h-4 w-4" />
                        <span>Connect Telegram / TON Wallet</span>
                      </button>
                    )}
                  </div>
                )}

                {/* RAIL 2: Base / EVM L2 */}
                {selectedCryptoRail === 'evm' && (
                  <div className="space-y-4">
                    {/* Destination Merchant Wallet Box */}
                    <div className="rounded-2xl border border-zinc-800 bg-black p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Destination Settlement Wallet (Base L2)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAddressToClipboard(merchantEvmAddress || (import.meta as any).env.VITE_MERCHANT_EVM_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e')}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-300 transition-colors"
                        >
                          {copiedAddress ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-zinc-400" />
                              <span>Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="font-mono text-xs text-white break-all bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 select-all">
                        {merchantEvmAddress || (import.meta as any).env.VITE_MERCHANT_EVM_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'}
                      </div>

                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Supported: Base L2 Network (USDC / USDT). Low fees, instantaneous confirmation.
                      </p>
                    </div>

                    {/* Web3 Direct Button if wallet detected */}
                    {typeof window !== 'undefined' && (window as any).ethereum && (
                      <button
                        type="button"
                        onClick={handleWeb3Pay}
                        disabled={verifyingEvm}
                        className="w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                      >
                        {verifyingEvm ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>1-Click Pay with Connected Web3 Wallet ({selectedPkg.price})</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* On-chain Tx Hash Instant Verifier */}
                    <form onSubmit={handleEvmVerify} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          On-Chain Transaction Hash (TxID)
                        </label>
                        <input
                          type="text"
                          required
                          value={evmTxHash}
                          onChange={(e) => setEvmTxHash(e.target.value)}
                          placeholder="0x... paste your confirmed Base / L2 transaction hash"
                          className="w-full rounded-xl bg-black border border-zinc-900 py-2.5 px-4 font-mono text-xs text-white placeholder-zinc-600 focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={verifyingEvm}
                        className="w-full rounded-xl bg-sky-500 py-3 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                      >
                        {verifyingEvm ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verifying on-chain via Base RPC...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verify On-Chain Transaction & Upgrade Account</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status Alert */}
        {statusMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* TRANSACTION HISTORY SECTION */}
        <div className="space-y-3 text-left pt-4 border-t border-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Transaction History</h3>
            </div>
            <button 
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 overflow-hidden">
            {history.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-light">
                No past transactions found.
              </div>
            ) : (
              <div className="divide-y divide-zinc-900/60">
                {history.map((record) => (
                  <div key={record.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-900/20 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-[11px]">
                          {record.package_type.replace('_', ' ')}
                        </span>
                        <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase font-mono">
                          {record.provider}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        {new Date(record.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="font-mono font-bold text-white block">
                        {record.currency} {record.amount}
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        {record.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(record)}
                            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-300 hover:text-white transition-colors"
                            title="View Official Receipt"
                          >
                            <FileText className="h-3 w-3 text-rose-500" />
                            <span>Receipt</span>
                          </button>
                        )}
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                          record.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : record.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* OFFICIAL TRANSACTION RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 print:p-0 print:bg-white animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-left print:border-none print:shadow-none print:text-black print:bg-white">
            {/* Close button (hidden when printing) */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute right-5 top-5 rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors print:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-500/25">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Official Payment Receipt
                </span>
                <h3 className="text-lg font-black text-white">HOOKED<span className="text-rose-500">.</span>ink</h3>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Receipt Ref / TxID</span>
                <span className="font-mono font-bold text-white break-all text-right max-w-[200px]">
                  {getReceiptNumber(selectedReceipt)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Date & Time</span>
                <span className="text-zinc-300 font-medium">
                  {new Date(selectedReceipt.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Customer</span>
                <span className="text-zinc-300 font-medium text-right">
                  {user?.full_name} <br />
                  <span className="text-[11px] text-zinc-500">{user?.email}</span>
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Payment Gateway</span>
                <span className="font-semibold uppercase text-rose-400 font-mono">
                  {selectedReceipt.provider}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Package Type</span>
                <span className="font-bold text-white uppercase">
                  {selectedReceipt.package_type.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-500">Settlement Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed & Verified
                </span>
              </div>

              <div className="flex justify-between pt-3 text-sm font-bold text-white">
                <span>Total Amount</span>
                <span className="font-mono text-base text-emerald-400">
                  {selectedReceipt.currency} {selectedReceipt.amount}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-2 print:hidden pt-3 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-bold text-white transition-colors border border-zinc-800"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-2.5 text-xs font-bold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
