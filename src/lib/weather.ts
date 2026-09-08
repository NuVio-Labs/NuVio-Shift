import {
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * WMO weather interpretation codes as returned by the Open-Meteo API
 * (https://open-meteo.com/en/docs — "WMO Weather interpretation codes").
 */
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Klarer Himmel",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bedeckt",
  45: "Nebel",
  48: "Reifnebel",
  51: "Leichter Nieselregen",
  53: "Mäßiger Nieselregen",
  55: "Starker Nieselregen",
  56: "Leichter gefrierender Nieselregen",
  57: "Starker gefrierender Nieselregen",
  61: "Leichter Regen",
  63: "Mäßiger Regen",
  65: "Starker Regen",
  66: "Leichter gefrierender Regen",
  67: "Starker gefrierender Regen",
  71: "Leichter Schneefall",
  73: "Mäßiger Schneefall",
  75: "Starker Schneefall",
  77: "Schneegriesel",
  80: "Leichte Regenschauer",
  81: "Mäßige Regenschauer",
  82: "Heftige Regenschauer",
  85: "Leichte Schneeschauer",
  86: "Starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit leichtem Hagel",
  99: "Gewitter mit starkem Hagel",
};

export const WEATHER_CODE_ICONS: Record<number, LucideIcon> = {
  0: SunIcon,
  1: SunIcon,
  2: CloudSunIcon,
  3: CloudIcon,
  45: CloudFogIcon,
  48: CloudFogIcon,
  51: CloudRainIcon,
  53: CloudRainIcon,
  55: CloudRainIcon,
  56: CloudRainIcon,
  57: CloudRainIcon,
  61: CloudRainIcon,
  63: CloudRainIcon,
  65: CloudRainIcon,
  66: CloudRainIcon,
  67: CloudRainIcon,
  71: CloudSnowIcon,
  73: CloudSnowIcon,
  75: CloudSnowIcon,
  77: CloudSnowIcon,
  80: CloudRainIcon,
  81: CloudRainIcon,
  82: CloudRainIcon,
  85: CloudSnowIcon,
  86: CloudSnowIcon,
  95: CloudLightningIcon,
  96: CloudLightningIcon,
  99: CloudLightningIcon,
};

const WEATHER_CODE_GRADIENTS: Record<number, string> = {
  0: "from-sky-400 to-amber-200",
  1: "from-sky-400 to-amber-100",
  2: "from-sky-300 to-slate-200",
  3: "from-slate-300 to-slate-400",
  45: "from-slate-300 to-slate-400",
  48: "from-slate-300 to-slate-400",
  51: "from-slate-400 to-sky-300",
  53: "from-slate-400 to-sky-300",
  55: "from-slate-500 to-sky-400",
  56: "from-slate-400 to-sky-300",
  57: "from-slate-500 to-sky-400",
  61: "from-slate-500 to-sky-400",
  63: "from-slate-500 to-sky-500",
  65: "from-slate-600 to-sky-500",
  66: "from-slate-500 to-sky-400",
  67: "from-slate-600 to-sky-500",
  71: "from-slate-200 to-sky-200",
  73: "from-slate-200 to-sky-300",
  75: "from-slate-300 to-sky-300",
  77: "from-slate-200 to-sky-200",
  80: "from-slate-500 to-sky-400",
  81: "from-slate-500 to-sky-500",
  82: "from-slate-600 to-sky-600",
  85: "from-slate-200 to-sky-200",
  86: "from-slate-300 to-sky-300",
  95: "from-slate-700 to-slate-500",
  96: "from-slate-700 to-slate-500",
  99: "from-slate-800 to-slate-600",
};

const DEFAULT_GRADIENT = "from-slate-300 to-slate-400";

export function describeWeatherCode(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unbekannt";
}

export const DEFAULT_WEATHER_ICON = CloudIcon;

export function getWeatherGradient(code: number): string {
  return WEATHER_CODE_GRADIENTS[code] ?? DEFAULT_GRADIENT;
}
