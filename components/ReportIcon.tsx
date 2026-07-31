/** @format */

import React from "react";
import {
  BanknotesIcon,
  BeakerIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  TruckIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { PdfIconName } from "../utils/pdfTheme";

/**
 * Maps the PDF icon vocabulary (PdfIconName from utils/pdfTheme.ts) to its
 * heroicon equivalent, so the on-screen/print HTML reports use the same
 * scannable iconography as the jsPDF reports.
 *
 * Coffee has no heroicon equivalent — BeakerIcon (a brew) is the closest
 * match for the coffee-machine theme.
 *
 * Typing the map as Record<PdfIconName, …> makes every missing icon a
 * compile error, mirroring the exhaustive default case in drawPdfIcon.
 */
const ICONS: Record<PdfIconName, React.ComponentType<{ className?: string }>> = {
  phone: PhoneIcon,
  mail: EnvelopeIcon,
  location: MapPinIcon,
  calendar: CalendarIcon,
  money: BanknotesIcon,
  wrench: WrenchScrewdriverIcon,
  cog: Cog6ToothIcon,
  package: CubeIcon,
  alert: ExclamationTriangleIcon,
  user: UserIcon,
  truck: TruckIcon,
  coffee: BeakerIcon,
  star: StarIcon,
  check: CheckCircleIcon,
  cross: XMarkIcon,
  doc: DocumentTextIcon,
  chart: ChartBarIcon,
  home: HomeIcon,
  clock: ClockIcon,
};

interface ReportIconProps {
  name: PdfIconName;
  className?: string;
}

/** Inline heroicon matching the PDF vector icon of the same name. */
const ReportIcon: React.FC<ReportIconProps> = ({ name, className = "w-3.5 h-3.5" }) => {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
};

export default ReportIcon;
