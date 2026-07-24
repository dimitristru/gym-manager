"use client";

import { useState } from "react";
import MemberScheduleTab from "./tabs/MemberScheduleTab";
import MemberPaymentsTab, { type PlanInfo, type SubRequestInfo } from "./tabs/MemberPaymentsTab";
import MemberProfileTab from "./tabs/MemberProfileTab";

type Tab = "schedule" | "payments" | "profile";

export interface Session {
  date: string;
  time: string;
  type: "recurring" | "reservation";
}

export interface SubscriptionInfo {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  isOngoing: boolean;
  total: number;
  paid: number;
  outstanding: number;
}

export interface ActiveSubscription {
  planName: string;
  endDate: string | null;   // ISO date string or null for ongoing
  maxClasses: number | null;
  classesLeft: number | null;
  classesUsed: number;      // check-ins within subscription period
}

export interface MemberPortalProps {
  memberId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  weeklySlots: { day: number; time: string }[];
  sessions: Session[];
  pendingRequestKeys: string[];
  pendingNewSessions: { date: string; time: string; requestId: string }[];
  activeSubscription: ActiveSubscription | null;
  subscriptions: SubscriptionInfo[];
  plans: PlanInfo[];
  subscriptionRequests: SubRequestInfo[];
  changeRequests: {
    id: string;
    type: "CANCEL" | "RESCHEDULE" | "NEW_SESSION";
    status: "PENDING" | "APPROVED" | "REJECTED";
    sessionDate: string;
    sessionTime: string;
    newDate: string | null;
    newTime: string | null;
    note: string | null;
    reviewNote: string | null;
    createdAt: string;
  }[];
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule", label: "Πρόγραμμα", icon: "📅" },
  { id: "payments", label: "Πληρωμές", icon: "💳" },
  { id: "profile", label: "Προφίλ", icon: "👤" },
];

export default function MemberPortal(props: MemberPortalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-8 p-1 rounded-2xl" style={{ backgroundColor: "#141414", border: "1px solid #1e1e1e" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={
              activeTab === tab.id
                ? { backgroundColor: "#f97316", color: "#fff" }
                : { color: "#71717a" }
            }
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "schedule" && <MemberScheduleTab {...props} />}
      {activeTab === "payments" && (
        <MemberPaymentsTab
          memberId={props.memberId}
          subscriptions={props.subscriptions}
          plans={props.plans}
          subscriptionRequests={props.subscriptionRequests}
        />
      )}
      {activeTab === "profile" && (
        <MemberProfileTab
          memberId={props.memberId}
          userName={props.userName}
          userEmail={props.userEmail}
          userPhone={props.userPhone}
        />
      )}
    </div>
  );
}
