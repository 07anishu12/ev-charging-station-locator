/**
 * FastCharger Data Quality Assurance & Anomaly Tracking
 *
 * Ensures that malformed, ambiguous, or incomplete data records do NOT silently disappear.
 * Anomalies are tracked in PostgreSQL's canonical `data_quality_issues` audit table.
 */

export const DATA_QUALITY_ISSUE_TYPES = {
  INVALID_COORDINATES: "invalid_coordinates",
  INVALID_PINCODE: "invalid_pincode",
  MISSING_CITY: "missing_city",
  AMBIGUOUS_CITY: "ambiguous_city",
  DUPLICATE_PROVIDER_RECORD: "duplicate_provider_record",
  MALFORMED_CONNECTOR: "malformed_connector",
  INVALID_STATUS: "invalid_status",
  MISSING_STATION_NAME: "missing_station_name",
  MISSING_OPERATOR: "missing_operator",
  UNRESOLVED_STATE: "unresolved_state",
} as const;

export type DataQualityIssueType =
  (typeof DATA_QUALITY_ISSUE_TYPES)[keyof typeof DATA_QUALITY_ISSUE_TYPES];

export interface QualityIssueRecord {
  issueType: DataQualityIssueType | string;
  severity: "error" | "warning" | "info";
  description: string;
  details?: Record<string, unknown>;
}

export interface StationQualityAuditInput {
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  city?: string | null;
  cityId?: string | null;
  isAmbiguousCity?: boolean;
  state?: string | null;
  name?: string | null;
  status?: string | null;
  operatorName?: string | null;
  connectors?: Array<{
    type?: string | null;
    powerKw?: number | null;
    status?: string | null;
  }>;
  isDuplicateProviderRecord?: boolean;
  duplicateProviderKey?: string;
}

export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function validateIndianPincode(
  pincode?: string | null,
): { valid: boolean; cleaned: string | null } {
  if (!pincode) return { valid: true, cleaned: null };
  const cleaned = pincode.replace(/\s+/g, "").trim();
  if (/^\d{6}$/.test(cleaned)) {
    return { valid: true, cleaned };
  }
  return { valid: false, cleaned: null };
}

const KNOWN_STATUSES = new Set([
  "operational",
  "planned",
  "not operational",
  "partially operational",
  "unknown",
]);

/**
 * Audits a station and its attributes against canonical data quality rules.
 * Returns an array of identified anomalies with appropriate severities.
 */
export function auditStationQuality(input: StationQualityAuditInput): QualityIssueRecord[] {
  const issues: QualityIssueRecord[] = [];

  // 1. Invalid coordinates
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    issues.push({
      issueType: DATA_QUALITY_ISSUE_TYPES.INVALID_COORDINATES,
      severity: "error",
      description: `Invalid or missing geographic coordinates: latitude=${input.latitude}, longitude=${input.longitude}`,
      details: { latitude: input.latitude, longitude: input.longitude },
    });
  }

  // 2. Invalid PIN code
  if (input.pincode) {
    const pinCheck = validateIndianPincode(input.pincode);
    if (!pinCheck.valid) {
      issues.push({
        issueType: DATA_QUALITY_ISSUE_TYPES.INVALID_PINCODE,
        severity: "warning",
        description: `Supplied postal code '${input.pincode}' is not a valid 6-digit Indian PIN code.`,
        details: { rawPincode: input.pincode },
      });
    }
  }

  // 3. Missing city
  if (!input.city && !input.cityId) {
    issues.push({
      issueType: DATA_QUALITY_ISSUE_TYPES.MISSING_CITY,
      severity: "warning",
      description: "Station record is missing an associated city or urban municipality.",
    });
  }

  // 4. Ambiguous city
  if (input.isAmbiguousCity) {
    issues.push({
      issueType: DATA_QUALITY_ISSUE_TYPES.AMBIGUOUS_CITY,
      severity: "warning",
      description: `City name '${input.city}' matches multiple canonical regions or ambiguous aliases.`,
      details: { city: input.city },
    });
  }

  // 5. Duplicate provider record
  if (input.isDuplicateProviderRecord) {
    issues.push({
      issueType: DATA_QUALITY_ISSUE_TYPES.DUPLICATE_PROVIDER_RECORD,
      severity: "error",
      description: `Duplicate upstream provider record detected: ${input.duplicateProviderKey || "unknown key"}`,
      details: { duplicateProviderKey: input.duplicateProviderKey },
    });
  }

  // 6. Malformed connector
  if (input.connectors) {
    for (const [index, conn] of input.connectors.entries()) {
      if (!conn.type || conn.type === "unknown" || conn.powerKw === undefined || (conn.powerKw !== null && conn.powerKw < 0)) {
        issues.push({
          issueType: DATA_QUALITY_ISSUE_TYPES.MALFORMED_CONNECTOR,
          severity: "warning",
          description: `Connector at index ${index} is missing a standardized connection type or contains invalid power capacity.`,
          details: { connectorIndex: index, connector: conn },
        });
      }
    }
  }

  // 7. Invalid status
  if (input.status) {
    const lowerStatus = input.status.trim().toLowerCase();
    if (!KNOWN_STATUSES.has(lowerStatus)) {
      issues.push({
        issueType: DATA_QUALITY_ISSUE_TYPES.INVALID_STATUS,
        severity: "warning",
        description: `Station status '${input.status}' does not match recognized operational states.`,
        details: { status: input.status },
      });
    }
  }

  // 8. Missing station name
  if (!input.name || input.name.trim().length === 0) {
    issues.push({
      issueType: DATA_QUALITY_ISSUE_TYPES.MISSING_STATION_NAME,
      severity: "info",
      description: "Station name was omitted by the data provider.",
    });
  }

  return issues;
}
