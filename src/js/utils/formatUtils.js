const msToTime = (duration, limit, showFullUnit) => {
    try {
        if (duration < 1e3) {
            return "0s";
        }
        let seconds = Math.floor((duration / 1e3) % 60),
            minutes = Math.floor((duration / 6e4) % 60),
            hours = Math.floor((duration / 3.6e6) % 24),
            days = Math.floor((duration / 8.64e7) % 7),
            weeks = Math.floor((duration / 6.048e8) % 4),
            months = Math.floor((duration / 2.4192e9) % 12),
            years = Math.floor((duration / 2.90304e10) % 10),
            decades = Math.floor((duration / 2.90304e11) % 10),
            century = Math.floor((duration / 2.90304e12) % 10),
            millenium = Math.floor((duration / 2.90304e13) % 10);
        if (limit <= 1) {
            const maxUnit = 
                millenium > 0 ? "mil"
                : century > 0 ? "cen"
                : decades > 0 ? "dec"
                : years > 0 ? "y"
                : months > 0 ? "mon"
                : weeks > 0 ? "w"
                : days > 0 ? "d"
                : hours > 0 ? "h"
                : minutes > 0 ? "m" : "s";
            switch (maxUnit) {
                case "mil": {
                    if (century > 0) {
                        millenium += century * .1;
                        millenium = (Math.round(millenium * 10) / 10) || 0;
                    }
                    break
                }
                case "cen": {
                    if (decades > 0) {
                        century += decades * .1;
                        century = (Math.round(century * 10) / 10) || 0;
                    }
                    break
                }
                case "dec": {
                    if (years > 0) {
                        decades += years * .1;
                        decades = (Math.round(decades * 10) / 10) || 0;
                    }
                    break
                }
                case "y": {
                    if (months > 0) {
                        years += months * .0833333333
                        years = (Math.round(years * 10) / 10) || 0;
                    }
                    break
                }
                case "mon": {
                    if (weeks > 0) {
                        months += weeks * .229984378;
                        months = (Math.round(months * 10) / 10) || 0;
                    }
                    break
                }
                case "w": {
                    if (days > 0) {
                        weeks += days * .142857143;
                        weeks = (Math.round(weeks * 10) / 10) || 0;
                    }
                    break
                }
                case "d": {
                    if (hours > 0) {
                        days += hours * .0416666667;
                        days = (Math.round(days * 10) / 10) || 0;
                    }
                    break
                }
                case "h": {
                    if (minutes > 0) {
                        hours += minutes * .0166666667;
                        hours = (Math.round(hours * 10) / 10) || 0;
                    }
                    break
                }
                case "m": {
                    if (seconds > 0) {
                        minutes += seconds * .0166666667;
                        minutes = (Math.round(minutes * 10) / 10) || 0;
                    }
                    break
                }
            }
        }
        let time = [];
        if (showFullUnit) {
            if (millenium > 0) time.push(`${millenium} ${millenium > 1 ? "millennia" : "millennium"}`);
            if (century > 0) time.push(`${century} centur${century > 1 ? "ies" : "y"}`);
            if (decades > 0) time.push(`${decades} decade${millenium > 1 ? "s" : ""}`);
            if (years > 0) time.push(`${years} year${years > 1 ? "s" : ""}`);
            if (months > 0) time.push(`${months} month${months > 1 ? "s" : ""}`);
            if (weeks > 0) time.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
            if (days > 0) time.push(`${days} day${days > 1 ? "s" : ""}`);
            if (hours > 0) time.push(`${hours} hour${hours > 1 ? "s" : ""}`);
            if (minutes > 0) time.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
            if (seconds > 0) time.push(`${seconds} second${seconds > 1 ? "s" : ""}`);
        } else {
            if (millenium > 0) time.push(`${millenium}mil`)
            if (century > 0) time.push(`${century}cen`)
            if (decades > 0) time.push(`${decades}dec`)
            if (years > 0) time.push(`${years}y`)
            if (months > 0) time.push(`${months}mon`)
            if (weeks > 0) time.push(`${weeks}w`)
            if (days > 0) time.push(`${days}d`)
            if (hours > 0) time.push(`${hours}h`)
            if (minutes > 0) time.push(`${minutes}m`)
            if (seconds > 0) time.push(`${seconds}s`)
        }
        if (limit > 0) {
            time = time.slice(0, limit)
        }
        return time.join(" ") || "0s"
    } catch {
        return ""
    }
}
const formatYear = (date) => {
    try {
        return date.toLocaleDateString(undefined, { year: "numeric" });
    } catch {
        return ""
    }
}
const formatMonth = (date) => {
    try {
        return date.toLocaleDateString(undefined, { month: "short" });
    } catch {
        return ""
    }
}
const formatDay = (date) => {
    try {
        return date.toLocaleDateString(undefined, { day: "numeric" });
    } catch {
        return ""
    }
}
const formatTime = (date) => {
    try {
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
        return ""
    }
}
const formatWeekday = (date) => {
    try {
        return date.toLocaleDateString(undefined, { weekday: "short" });
    } catch {
        return ""
    }
}
const formatNumber = (number, dec = 2) => {
    if (typeof number === "number") {
        const formatter = new Intl.NumberFormat("en-US", {
            maximumFractionDigits: dec, // display up to 2 decimal places
            minimumFractionDigits: 0, // display at least 0 decimal places
            notation: "compact", // use compact notation for large numbers
            compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
        });
        if (Math.abs(number) >= 1000) {
            return formatter.format(number);
        } else if (Math.abs(number) < 0.01 && Math.abs(number) > 0) {
            return number.toExponential(0);
        } else {
            let formattedNumber = number.toFixed(dec);
            // Remove trailing zeros and decimal point if not needed
            if (formattedNumber.indexOf(".") !== -1) {
                formattedNumber = formattedNumber.replace(/\.?0+$/, "");
            }
            return formattedNumber || number.toLocaleString("en-US", { maximumFractionDigits: dec });
        }
    } else {
        return null;
    }
}
export {
    msToTime,
    formatYear,
    formatMonth,
    formatDay,
    formatTime,
    formatWeekday,
    formatNumber,
}