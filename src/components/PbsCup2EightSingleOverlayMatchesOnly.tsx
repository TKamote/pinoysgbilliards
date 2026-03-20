"use client";

import PbsCup2EightSingleOverlay from "@/components/PbsCup2EightSingleOverlay";

interface Props {
  players: Array<{
    id: string;
    name: string;
    points: number;
    photoURL?: string;
  }>;
  canEdit: boolean;
}

export default function PbsCup2EightSingleOverlayMatchesOnly({ players, canEdit }: Props) {
  return <PbsCup2EightSingleOverlay players={players} canEdit={canEdit} variant="overlayOnly" />;
}

