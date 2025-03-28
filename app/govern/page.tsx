"use client";

import { Typography } from "@/components/ui/Typography";
import { useState } from "react";
import { DrawerItem } from "@/components/DrawerItem";
import { SectionHeader } from "@/components/SectionHeader";
import { TabSwiper } from "@/components/TabSwiper";
import { OpenLetterCard } from "@/components/OpenLetterCard";
import { PollOfTheDay } from "@/components/PollOfTheDay";

export default function GovernPage() {
  const [activeTab, setActiveTab] = useState("Polls");

  const renderContent = () => {
    switch (activeTab) {
      case "Polls":
        return (
          <>
            <SectionHeader
              title="Poll of the Day"
              description="Quick votes on current topics"
            />
            <PollOfTheDay />
          </>
        );
      case "Open letters":
        return (
          <>
            <SectionHeader
              title="Open Letters"
              description="Public statements to decision makers"
            />
            <OpenLetterCard
              title="Statement on AI Risk"
              referenceTitle="Center for AI Safety"
              referenceUrl="https://www.safe.ai/work/statement-on-ai-risk"
              voteUrl="https://vote.one/kJc54AbK"
            />
            <OpenLetterCard
              title="UN Ban on Nuclear Weapons Open Letter"
              referenceTitle="Future of Life Institute"
              referenceUrl="https://futureoflife.org/open-letter/nuclear-open-letter/"
              voteUrl="https://vote.one/w1MDn0Dt"
            />
            <OpenLetterCard
              title="Lethal Autonomous Weapons Pledge"
              referenceTitle="Future of Life Institute"
              referenceUrl="https://futureoflife.org/open-letter/lethal-autonomous-weapons-pledge/"
              voteUrl="https://vote.one/eASgdeUE"
            />
            <OpenLetterCard
              title="Open letter calling on world leaders to show long-view leadership on existential threats"
              referenceTitle="Future of Life Institute"
              referenceUrl="https://futureoflife.org/open-letter/long-view-leadership-on-existential-threats/"
              voteUrl="https://vote.one/NtprLPWh"
            />
            <DrawerItem title="Add your open letter" isAddNew />
          </>
        );
      case "Elections":
        return (
          <>
            <SectionHeader
              title="Elections"
              description="Choose your representatives"
            />
            <DrawerItem title="World Constituent Assembly Election" />
          </>
        );
      case "Referendums":
        return (
          <>
            <SectionHeader
              title="Referendums"
              description="Direct votes on important issues"
            />
            <DrawerItem title="World Constitutional Referendum" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-safe flex min-h-dvh flex-col px-6">
      <div className="fixed left-0 right-0 top-0 z-10 bg-gray-0 px-6 pt-6">
        <Typography
          as="h2"
          variant={{ variant: "heading", level: 2 }}
          className="h-9 items-center"
        >
          Govern
        </Typography>

        <TabSwiper
          tabs={["Polls", "Open letters", "Elections", "Referendums"]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="mt-[112px] flex flex-1 flex-col items-center justify-center pb-8">
        {renderContent()}
      </div>
    </div>
  );
}
