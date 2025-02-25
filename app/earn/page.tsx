"use client";

import { Typography } from "@/components/ui/Typography";
import { useState, useEffect } from "react";
import {
  PiHandCoinsFill,
  PiUserPlusFill,
  PiPlantFill,
  PiWalletFill,
} from "react-icons/pi";
import { Drawer, DrawerTrigger } from "@/components/ui/Drawer";
import { WalletAuth } from "@/components/WalletAuth";
import { useWallet } from "@/components/contexts/WalletContext";
import { viemClient } from "@/lib/viemClient";
import { parseAbi } from "viem";
import { MiniKit } from "@worldcoin/minikit-js";
import { TabSwiper } from "@/components/TabSwiper";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { Button } from "@/components/ui/Button";
import { ComingSoonDrawer } from "@/components/ComingSoonDrawer";
import { StakeWithPermitForm } from "@/components/StakeWithPermitForm";

export default function EarnPage() {
  // Global wallet state remains for things like address and token balance
  const { walletAddress, tokenBalance, fetchBalance } = useWallet();

  // Localize basic income state since these values are only used here
  const [claimable, setClaimable] = useState<number>(0);
  const [basicIncomeActivated, setBasicIncomeActivated] = useState(false);
  const [basicIncomeLoading, setBasicIncomeLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Basic income");
  const [transactionId, setTransactionId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSeenSavings, setHasSeenSavings] = useState(() => {
    return localStorage.getItem("hasSeenSavings") === "true";
  });

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    client: viemClient,
    appConfig: {
      app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
    },
    transactionId: transactionId,
  });

  // Helper to convert wei values
  const fromWei = (value: bigint) => (Number(value) / 1e18).toString();

  useEffect(() => {
    const updateBasicIncomeInfo = async () => {
      if (!walletAddress) return;
      console.log(`[BasicIncome] Fetching data for wallet: ${walletAddress}`);
      try {
        const result = await viemClient.readContract({
          address: "0x02c3B99D986ef1612bAC63d4004fa79714D00012",
          abi: parseAbi([
            "function getStakeInfo(address) external view returns (uint256, uint256)",
          ]),
          functionName: "getStakeInfo",
          args: [walletAddress as `0x${string}`],
        });
        console.log("[BasicIncome] Fetched result:", result);

        if (Array.isArray(result) && result.length === 2) {
          const stakedAmount = fromWei(result[0]);
          const newClaimable = fromWei(result[1]);
          console.log(
            "[BasicIncome] Parsed values - stakedAmount:",
            stakedAmount,
            "newClaimable:",
            newClaimable
          );

          setClaimable(parseFloat(newClaimable));

          if (basicIncomeLoading) {
            console.log("[BasicIncome] Basic income info has been loaded.");
            setBasicIncomeLoading(false);
          }

          if (newClaimable !== "0" || stakedAmount !== "0") {
            setBasicIncomeActivated(true);
            console.log("[BasicIncome] Basic income activated set to true");
          } else {
            setBasicIncomeActivated(false);
            console.log("[BasicIncome] Basic income activated set to false");
          }
        }
      } catch (error) {
        console.error("[BasicIncome] Error updating info:", error);
      }
    };

    // Immediately fetch the on-chain data, then poll every second.
    updateBasicIncomeInfo();
    const interval = setInterval(updateBasicIncomeInfo, 1000);
    return () => clearInterval(interval);
  }, [walletAddress, basicIncomeLoading]);

  useEffect(() => {
    if (transactionId) {
      fetchBalance();
    }
  }, [transactionId, fetchBalance]);

  const sendSetup = async () => {
    if (!MiniKit.isInstalled()) return;
    setIsSubmitting(true);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: "0x02c3B99D986ef1612bAC63d4004fa79714D00012",
            abi: parseAbi(["function stake() external"]),
            functionName: "stake",
            args: [],
          },
        ],
      });

      if (finalPayload.status === "error") {
        console.error("Error sending transaction", finalPayload);
      } else {
        setTransactionId(finalPayload.transaction_id);
        await fetchBalance();
        setBasicIncomeActivated(true);
      }
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendClaim = async () => {
    if (!MiniKit.isInstalled()) return;
    setIsSubmitting(true);
    console.log("[Claim] Sending claim transaction...");
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address:
              "0x02c3B99D986ef1612bAC63d4004fa79714D00012" as `0x${string}`,
            abi: parseAbi(["function claimRewards() external"]),
            functionName: "claimRewards",
            args: [],
          },
        ],
      });
      console.log("[Claim] Transaction response:", finalPayload);

      if (finalPayload.status === "error") {
        console.error("[Claim] Error sending transaction", finalPayload);
      } else {
        setTransactionId(finalPayload.transaction_id);
        console.log("[Claim] Transaction ID set:", finalPayload.transaction_id);
        await fetchBalance();
        console.log("[Claim] Balance fetched successfully");
      }
    } catch (error: any) {
      console.error("[Claim] Error during claim:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "Savings") {
      setHasSeenSavings(true);
      localStorage.setItem("hasSeenSavings", "true");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Basic income":
        if (basicIncomeLoading) {
          return (
            <div className="flex w-full flex-col items-center py-6">
              <p>Loading your basic income details...</p>
            </div>
          );
        }

        return (
          <div className="flex w-full flex-col items-center py-6">
            <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <PiHandCoinsFill className="h-10 w-10 text-gray-400" />
            </div>
            <Typography as="h2" variant="heading" level={1}>
              Basic Income
            </Typography>

            {walletAddress === null ? (
              <>
                <Typography
                  variant="subtitle"
                  level={1}
                  className="mx-auto mb-10 mt-4 text-center text-gray-500"
                >
                  Sign in to claim your basic income
                </Typography>
                <WalletAuth onError={(error) => console.error(error)} />
              </>
            ) : !basicIncomeActivated ? (
              <>
                <Typography
                  variant="subtitle"
                  level={1}
                  className="mx-auto mb-10 mt-4 text-center text-gray-500"
                >
                  Set up your basic income
                </Typography>
                <Button
                  onClick={sendSetup}
                  isLoading={isSubmitting || isConfirming}
                  fullWidth
                >
                  Activate basic income
                </Button>
              </>
            ) : (
              <>
                <Typography
                  variant="subtitle"
                  level={1}
                  className="mx-auto mb-10 mt-4 text-center text-gray-500"
                >
                  Claimable drachma
                </Typography>
                <div className="text-center">
                  <p className="mx-auto mb-14 font-sans text-[56px] font-semibold leading-narrow tracking-normal">
                    {claimable.toFixed(5)}
                  </p>
                </div>
                <Button
                  onClick={sendClaim}
                  isLoading={isSubmitting || isConfirming}
                  fullWidth
                >
                  Claim
                </Button>
              </>
            )}
          </div>
        );
      case "Savings":
        return (
          <div className="flex w-full flex-col items-center py-6">
            <Typography as="h2" variant={{ variant: "heading", level: 1 }}>
              Savings Account
            </Typography>
            <Typography
              variant={{ variant: "subtitle", level: 1 }}
              className="mx-auto mb-10 mt-4 text-center text-gray-500"
            >
              Earn interest every second
            </Typography>
            <StakeWithPermitForm />
          </div>
        );
      case "Contribute":
        return (
          <div className="flex w-full flex-col items-center py-6">
            <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <PiPlantFill className="h-10 w-10 text-gray-400" />
            </div>
            <Typography as="h2" variant={{ variant: "heading", level: 1 }}>
              Contribute
            </Typography>
            <Typography
              variant={{ variant: "subtitle", level: 1 }}
              className="mx-auto mb-10 mt-4 text-center text-gray-500"
            >
              Get involved, get rewarded
            </Typography>
            <Drawer>
              <DrawerTrigger asChild>
                <div className="flex h-14 w-full cursor-pointer items-center justify-between rounded-xl bg-gray-100">
                  <div className="flex w-full items-center justify-center">
                    <Typography
                      as="h3"
                      variant={{ variant: "subtitle", level: 2 }}
                      className="line-clamp-2 font-display font-semibold tracking-normal text-gray-300"
                    >
                      Learn more
                    </Typography>
                  </div>
                </div>
              </DrawerTrigger>
              <ComingSoonDrawer />
            </Drawer>
          </div>
        );
      case "Invite":
        return (
          <div className="flex w-full flex-col items-center py-6">
            <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
              <PiUserPlusFill className="h-10 w-10 text-gray-400" />
            </div>
            <Typography as="h2" variant={{ variant: "heading", level: 1 }}>
              Invite
            </Typography>
            <Typography
              variant={{ variant: "subtitle", level: 1 }}
              className="mx-auto mb-10 mt-4 text-center text-gray-500"
            >
              Spread the word
            </Typography>
            <Drawer>
              <DrawerTrigger asChild>
                <div className="flex h-14 w-full cursor-pointer items-center justify-between rounded-xl bg-gray-100">
                  <div className="flex w-full items-center justify-center">
                    <Typography
                      as="h3"
                      variant={{ variant: "subtitle", level: 2 }}
                      className="line-clamp-2 font-display font-semibold tracking-normal text-gray-300"
                    >
                      Copy referral link
                    </Typography>
                  </div>
                </div>
              </DrawerTrigger>
              <ComingSoonDrawer />
            </Drawer>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-20">
      <div className="mt-5 flex items-center justify-between">
        <div className="flex h-10 items-center">
          <Typography as="h2" variant={{ variant: "heading", level: 2 }}>
            Earn
          </Typography>
        </div>
        {walletAddress && (
          <a
            href="https://worldcoin.org/mini-app?app_id=app_a4f7f3e62c1de0b9490a5260cb390b56&path=%3Ftab%3Dswap%26fromToken%3D0x2cFc85d8E48F8EAB294be644d9E25C3030863003%26amount%3D1000000000000000000%26toToken%3D0xEdE54d9c024ee80C85ec0a75eD2d8774c7Fbac9B%26referrerAppId%3Dapp_66c83ab8c851fb1e54b1b1b62c6ce39d"
            className="flex h-10 items-center gap-2 rounded-full bg-gray-100 px-4"
          >
            <PiWalletFill className="h-5 w-5" />
            <Typography
              variant={{ variant: "number", level: 6 }}
              className="text-base"
            >
              {tokenBalance
                ? `${Number(tokenBalance).toFixed(2)} WDD`
                : "0.00 WDD"}
            </Typography>
          </a>
        )}
      </div>

      <TabSwiper
        tabs={["Basic income", "Savings", "Contribute", "Invite"]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Red dot for Savings tab */}
      {!hasSeenSavings && activeTab !== "Savings" && (
        <div className="absolute left-[219px] top-[77px] z-10 opacity-65">
          <span className="block h-1.5 w-1.5 rounded-full bg-error-800" />
        </div>
      )}

      <div className="flex flex-1 items-center">{renderContent()}</div>
    </div>
  );
}
