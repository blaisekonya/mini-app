"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { parseAbi } from "viem";
import { viemClient } from "@/lib/viemClient";
import { MiniKit } from "@worldcoin/minikit-js";

interface WalletContextProps {
  walletAddress: string | null;
  username: string | null;
  tokenBalance: string | null;
  setWalletAddress: (address: string) => void;
  setUsername: (username: string) => void;
  fetchBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextProps>({
  walletAddress: null,
  username: null,
  tokenBalance: null,
  setWalletAddress: () => {},
  setUsername: () => {},
  fetchBalance: async () => {},
});

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);

  // Helper to convert from wei (bigint) to a human-readable string value.
  const fromWei = (value: bigint) => (Number(value) / 1e18).toString();

  // Rehydrate authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.walletAddress) {
          setWalletAddress(data.walletAddress);
          // Optionally set the username if available in MiniKit
          if (MiniKit.user?.username) {
            setUsername(MiniKit.user.username);
          }
        }
      } catch (error) {
        console.error("Error checking auth status", error);
      }
    };

    checkAuthStatus();
  }, []);

  const fetchBalance = async () => {
    if (!walletAddress) return;
    try {
      const balanceResult = await viemClient.readContract({
        address: "0xEdE54d9c024ee80C85ec0a75eD2d8774c7Fbac9B",
        abi: parseAbi([
          "function balanceOf(address) external view returns (uint256)",
        ]),
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });

      if (typeof balanceResult === "bigint") {
        const newTokenBalance = fromWei(balanceResult);
        setTokenBalance(newTokenBalance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  useEffect(() => {
    if (!walletAddress) return;

    fetchBalance();

    try {
      const unwatch = viemClient.watchContractEvent({
        address: "0xEdE54d9c024ee80C85ec0a75eD2d8774c7Fbac9B",
        abi: parseAbi([
          "event Transfer(address indexed from, address indexed to, uint256 value)",
        ]),
        eventName: "Transfer",
        args: [walletAddress as `0x${string}`, walletAddress as `0x${string}`],
        onLogs: fetchBalance,
      });

      return () => unwatch();
    } catch (error) {
      console.error("Error watching Transfer events:", error);
    }
  }, [walletAddress]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        username,
        tokenBalance,
        setWalletAddress,
        setUsername,
        fetchBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
