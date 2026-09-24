type ConnectResponse = {
  data: {
    blockchainid: string;
    publicKey: string;
  };
};

export type NoshUltraWallet = {
  connect: (params?: { onlyIfTrusted?: boolean }) => Promise<ConnectResponse>;
  disconnect: () => Promise<unknown>;
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
    const candidate = error as { message?: string; code?: number };
    if (candidate.code === 4001) return "Wallet request was cancelled.";
    if (candidate.message) return candidate.message;
  }

  return "Ultra Wallet request failed.";
}
