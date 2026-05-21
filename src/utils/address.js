/**
 * Safely parses a structured address line into component fields.
 * Expected format examples:
 * - "House Name, House No, Floor FloorNo, Society" -> 4 parts
 * - "House No, Floor FloorNo, Society" -> 3 parts with Floor
 * - "House Name, House No, Society" -> 3 parts without Floor
 * - "House No, Society" -> 2 parts
 * - "Society" -> 1 part
 * 
 * @param {string} addressLine - The raw address line to parse
 * @returns {Object} { house_no, floor, society }
 */
export function parseAddressLine(addressLine) {
  const fallback = {
    house_no: 'Home',
    floor: 'Ground',
    society: addressLine || ''
  };

  if (!addressLine) return fallback;

  // Split by comma with optional spaces to handle formatting inconsistencies
  const parts = addressLine.split(',').map(p => p.trim()).filter(Boolean);
  
  let hName = '';
  let hNo = '';
  let fl = '';
  let soc = '';

  if (parts.length >= 4) {
    [hName, hNo, fl, soc] = parts;
    fl = fl.replace(/^Floor\s+/i, '');
  } else if (parts.length === 3) {
    if (/^Floor\s+/i.test(parts[1])) {
      [hNo, fl, soc] = parts;
      fl = fl.replace(/^Floor\s+/i, '');
    } else {
      [hName, hNo, soc] = parts;
    }
  } else if (parts.length === 2) {
    [hNo, soc] = parts;
  } else if (parts.length === 1) {
    soc = parts[0];
  }

  return {
    house_no: hNo || hName || 'Home',
    floor: fl || 'Ground',
    society: soc || addressLine
  };
}
