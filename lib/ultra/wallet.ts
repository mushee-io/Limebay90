import type { WalletAction } from "./types";

type ConnectResponse = {
  data: {
    blockchainid: string;
    publicKey: string;
  };
};

type SignTransactionResponse = {
  data: {
    transactionHash: string;
    processed?: {
      block_num?: number;
      block_time?: string;
      receipt?: unknown;
      action_traces?: unknown[];
    } | null;
  };
};

export type NoshUltraWallet = {
  connect: (params?: { onlyIfTrusted?: boolean }) => Promise<ConnectResponse>;
  disconnect: () => Promise<unknown>;
  signTransaction: (
    transaction: WalletAction | WalletAction[],
    options?: { signOnly?: boolean },
  ) => Promise<SignTransactionResponse>;
  getChainId?: () => Promise<{ data: string }>;
  dispose?: () => void;
};

let walletPromise: Promise<NoshUltraWallet> | undefined;

export function hasUltraExtension() {
  return typeof window !== "undefined" && "ultra" in window;
}

export async function getUltraWallet(): Promise<NoshUltraWallet> {
  if (typeof window === "undefined") {
    throw new Error("Ultra Wallet is only available in the browser.");
  }

  if (!walletPromise) {
    walletPromise = import("@ultraos/wallet-sdk").then(({ UltraWalletSDK }) => {
      return new UltraWalletSDK({
        environment: "testnet",
        provider: "extension",
      }) as unknown as NoshUltraWallet;
    });
  }

  return walletPromise;
}

export function walletErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error) {
    const candidate = error as {
      message?: string;
      code?: number;
      data?: unknown;
    };

    if (candidate.code === 4001) return "Wallet request was cancelled.";
    if (candidate.code === -32003) {
      const detail =
        typeof candidate.data === "string" ? candidate.data : candidate.message;
      return detail || "Ultra rejected the transaction.";
    }
    if (candidate.message) return candidate.message;
  }

  return "Ultra Wallet request failed.";
}
