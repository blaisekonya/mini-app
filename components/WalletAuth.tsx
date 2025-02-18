"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { useState } from "react";
import { Button } from "./ui/Button";
import { useWallet } from "@/components/contexts/WalletContext";

interface WalletAuthProps {
  onError?: (error: string) => void;
  onSuccess?: (walletAddress: string, username: string) => void;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 8,
  delay = 1000
): Promise<Response> {
  console.log(`fetchWithRetry: Calling ${url} with ${retries} retries left`);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) {
      console.error(`fetchWithRetry: No more retries for ${url}`);
      throw error;
    }
    console.warn(
      `fetchWithRetry: Error calling ${url}. Retrying in ${delay}ms. Error:`,
      error
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay);
  }
}

export function WalletAuth({ onError, onSuccess }: WalletAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { setWalletAddress, setUsername } = useWallet();

  const handleError = (message: string) => {
    console.error("handleError:", message);
    onError?.(message);
    setIsLoading(false);
  };

  const signInWithWallet = async () => {
    console.log("signInWithWallet: Button clicked");
    if (!MiniKit.isInstalled()) {
      console.warn("signInWithWallet: MiniKit is not installed");
      handleError("MiniKit is not installed");
      alert("Please open this app in the World App to connect your wallet.");
      return;
    }

    console.log("signInWithWallet: MiniKit is installed");
    setIsLoading(true);

    try {
      console.log("signInWithWallet: Fetching nonce from /api/nonce");
      const nonceRes = await fetchWithRetry(`/api/nonce`);
      const { nonce } = await nonceRes.json();
      console.log("signInWithWallet: Nonce received", nonce);

      console.log(
        "signInWithWallet: Calling MiniKit.commandsAsync.walletAuth with nonce:",
        nonce
      );
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: "Sign in to World Republic",
        expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      console.log("signInWithWallet: walletAuth response", finalPayload);

      if (finalPayload.status === "error") {
        console.error(
          "signInWithWallet: Authentication returned an error",
          finalPayload
        );
        handleError("Authentication failed");
        return;
      }

      console.log(
        "signInWithWallet: Calling /api/complete-siwe with the payload and nonce"
      );
      const completeRes = await fetchWithRetry("/api/complete-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: finalPayload, nonce }),
      });
      const result = await completeRes.json();
      console.log("signInWithWallet: complete-siwe response", result);

      if (result.status === "success" && result.isValid) {
        const fetchedWalletAddress = finalPayload.address;
        console.log(
          "signInWithWallet: Authentication successful. Wallet Address:",
          fetchedWalletAddress
        );
        if (fetchedWalletAddress) {
          setWalletAddress(fetchedWalletAddress);

          let fetchedUsername = null;
          try {
            console.log(
              "signInWithWallet: Fetching username from https://usernames.worldcoin.org/api/v1/",
              fetchedWalletAddress
            );
            const usernameRes = await fetchWithRetry(
              `https://usernames.worldcoin.org/api/v1/${fetchedWalletAddress}`
            );
            const usernameData = await usernameRes.json();
            console.log("signInWithWallet: Username response", usernameData);
            fetchedUsername = usernameData.username || "Unknown";
          } catch (error: any) {
            console.error("signInWithWallet: Error fetching username", error);
          } finally {
            setUsername(fetchedUsername);
            console.log(
              "signInWithWallet: Calling onSuccess callback with",
              fetchedWalletAddress,
              fetchedUsername
            );
            onSuccess?.(fetchedWalletAddress, fetchedUsername);
          }
        } else {
          console.warn(
            "signInWithWallet: Wallet address not found in MiniKit.user"
          );
        }
      } else {
        console.error("signInWithWallet: SIWE verification failed", result);
        onError?.("Verification failed");
      }
    } catch (error) {
      console.error("signInWithWallet: Error during wallet auth", error);
      onError?.("Authentication failed");
    } finally {
      console.log("signInWithWallet: Setting isLoading to false");
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={signInWithWallet} isLoading={isLoading} fullWidth>
      Connect wallet
    </Button>
  );
}
