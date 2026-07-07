// ==========================================================================
// METEOROLOGICAL TELEMETRY PORTAL - LED DASHBOARD CONTROLLER (1920x1080)
// High Fidelity Updates, Parabolic Solar/Lunar Logic, and Scale-to-Fit
// ==========================================================================

// API & Endpoint Configurations
const OPENWEATHER_API_KEY = '752406cbf365a50d94cb4b71f1a7a9aa';
const LATITUDE = 23.3330;  // Purulia Coordinates
const LONGITUDE = 86.3660;
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxprw8MplyUrNzFp2IHXKj508o3DkDiFUesfFfOScWmauKbf63th2qDfyKHx0Zr7gZh5g/exec';

// Global Data Cache and System State
let weatherDataCache = {
    sheetsData: null,
    openWeatherData: null,
    lastPressure: null,
    pressureTrend: 'Steady',
    activeTelemetry: null
};

// Rainfall rolling history (24 data points, one per fetch cycle)
const rainfallHistory = Array(24).fill(0);

// DOM References
let containerEl, dateEl, timeEl, currentTempEl, feelsTempEl, comfortTextEl, tempProgressEl,
    lowTempEl, highTempEl, humidityValEl, humidityProgressEl, pressureValEl, pressureTrendEl,
    pressureProgressEl, altitudeValEl, gasValEl, forecastIconBoxEl, forecastTextEl,
    sunElementEl, moonElementEl, moonCharEl, sunriseLblEl, sunsetLblEl, daylightLblEl,
    moonDetailsLblEl, skyBackdropEl, rainAccumEl, rainHourlyEl, rainIntensityBadgeEl,
    rainAnimationLayerEl, compassSpeedEl, windNeedleEl, windAnemometerCupsEl, windAvgValEl,
    windGustValEl, windDirDegEl, windStrengthBadgeEl, aqiValEl, aqiStatusBadgeEl,
    aqiIndicatorPinEl, pm25ValEl, pm25ProgressEl, pm10ValEl, pm10ProgressEl, coValEl, no2ValEl,
    safetyPanelEl, safetyIconEl, safetyTitleEl, alertMessagesBoxEl, dataSourceMetaEl, quickWeatherTextEl,
    moonLitPathEl, moonIllumPctEl, moonPhaseNameEl, nextFullMoonValEl,
    moonDurationLblEl, moonriseLblEl, moonsetLblEl;

// 1. Viewport Fitting: Rigorous Scale-to-Fit Algorithm
function adjustScale() {
    if (!containerEl) return;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    
    // Scale factor to preserve 16:9 ratio of 1920x1080 design workspace
    const scale = Math.min(winWidth / 1920, winHeight / 1080);
    
    containerEl.style.transform = `scale(${scale})`;
    
    // Mathematically center the container on screen
    const left = (winWidth - 1920 * scale) / 2;
    const top = (winHeight - 1080 * scale) / 2;
    
    containerEl.style.left = `${left}px`;
    containerEl.style.top = `${top}px`;
}

// Bind DOM Element References
function initDOMElements() {
    containerEl = document.getElementById('dashboard-container');
    dateEl = document.getElementById('date-part');
    timeEl = document.getElementById('time-part');
    quickWeatherTextEl = document.getElementById('quick-weather-text');
    
    currentTempEl = document.getElementById('current-temp');
    feelsTempEl = document.getElementById('feels-temp');
    comfortTextEl = document.getElementById('comfort-text');
    tempProgressEl = document.getElementById('temp-progress');
    lowTempEl = document.getElementById('low-temp');
    highTempEl = document.getElementById('high-temp');
    
    humidityValEl = document.getElementById('humidity-val');
    humidityProgressEl = document.getElementById('humidity-progress');
    pressureValEl = document.getElementById('pressure-val');
    pressureTrendEl = document.getElementById('pressure-trend');
    pressureProgressEl = document.getElementById('pressure-progress');
    altitudeValEl = document.getElementById('altitude-val');
    gasValEl = document.getElementById('gas-val');
    
    forecastIconBoxEl = document.getElementById('forecast-icon-box');
    forecastTextEl = document.getElementById('forecast-text');
    
    sunElementEl = document.getElementById('sun-node-node');
    moonElementEl = document.getElementById('moon-node-node');
    moonCharEl = document.getElementById('moon-char-node');
    sunriseLblEl = document.getElementById('sunrise-time-val');
    sunsetLblEl = document.getElementById('sunset-time-val');
    daylightLblEl = document.getElementById('daylight-duration-val');
    
    moonDurationLblEl = document.getElementById('moon-duration-val');
    moonriseLblEl = document.getElementById('moonrise-time-val');
    moonsetLblEl = document.getElementById('moonset-time-val');
    moonLitPathEl = document.getElementById('moon-lit-path');
    moonIllumPctEl = document.getElementById('moon-illum-pct');
    moonPhaseNameEl = document.getElementById('moon-phase-name');
    nextFullMoonValEl = document.getElementById('next-full-moon-val');
    skyBackdropEl = document.getElementById('sky-backdrop');
    
    rainAccumEl = document.getElementById('rain-accum');
    rainHourlyEl = document.getElementById('rain-hourly');
    rainIntensityBadgeEl = document.getElementById('rain-intensity-badge');
    rainAnimationLayerEl = document.getElementById('rain-animation-layer');
    
    compassSpeedEl = document.getElementById('compass-speed');
    windNeedleEl = document.getElementById('wind-needle');
    windAnemometerCupsEl = document.getElementById('wind-anemometer-cups');
    windAvgValEl = document.getElementById('wind-avg-val');
    windGustValEl = document.getElementById('wind-gust-val');
    windDirDegEl = document.getElementById('wind-dir-deg');
    windStrengthBadgeEl = document.getElementById('wind-strength-badge');
    
    aqiValEl = document.getElementById('aqi-val');
    aqiStatusBadgeEl = document.getElementById('aqi-status-badge');
    aqiIndicatorPinEl = document.getElementById('aqi-indicator-pin');
    pm25ValEl = document.getElementById('pm25-val');
    pm25ProgressEl = document.getElementById('pm25-progress');
    pm10ValEl = document.getElementById('pm10-val');
    pm10ProgressEl = document.getElementById('pm10-progress');
    
    coValEl = document.getElementById('co-val');
    no2ValEl = document.getElementById('no2-val');
    safetyPanelEl = document.getElementById('safety-panel');
    safetyIconEl = document.getElementById('safety-icon');
    safetyTitleEl = document.getElementById('safety-title');
    alertMessagesBoxEl = document.getElementById('alert-messages-box');
    dataSourceMetaEl = document.getElementById('data-source-meta');
}

// Clock Loop
function updateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', optionsDate);
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-IN', optionsTime);
    
    // Smoothly update Sun and Moon path every second if telemetry is loaded
    if (weatherDataCache.activeTelemetry) {
        const moon = calculateMoonPhase(now);
        updateCelestialPosition(
            weatherDataCache.activeTelemetry.sunrise, 
            weatherDataCache.activeTelemetry.sunset, 
            moon
        );
    }
}

// Calculation Utilities
function calculateVOC(gasResistance) {
    if (!gasResistance || gasResistance <= 0) return 0.5;
    // Logarithmic curve mapping raw Ohm resistance to VOC ppm:
    // VOC (ppm) = 0.1 + (150000 / Rg)^1.2 * 0.5
    const ratio = 150000 / gasResistance;
    const voc = 0.1 + Math.pow(ratio, 1.2) * 0.5;
    return Math.min(Math.max(voc, 0.05), 50.0);
}

function calculateHeatIndex(temp, rh) {
    if (temp < 27) return temp;
    let T = (temp * 9/5) + 32;
    let R = rh;
    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));
    if (HI >= 80) {
        let c1 = -42.379, c2 = 2.04901523, c3 = 10.14333127, c4 = -0.22475541,
            c5 = -0.00683783, c6 = -0.05481717, c7 = 0.00122874, c8 = 0.00085282, c9 = -0.00000199;
        HI = c1 + c2*T + c3*R + c4*T*R + c5*T*T + c6*R*R + c7*T*T*R + c8*T*R*R + c9*T*T*R*R;
        if (R < 13 && T >= 80 && T <= 112) {
            HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
        } else if (R > 85 && T >= 80 && T <= 87) {
            HI += ((R - 85) / 10) * ((87 - T) / 5);
        }
    }
    return (HI - 32) * 5/9;
}

function getComfortDescription(temp, rh) {
    if (temp > 35) return rh > 55 ? "Oppressive Heat" : "Extreme Hot/Dry";
    if (temp > 28) {
        if (rh > 70) return "Sultry & Stifling";
        if (rh > 50) return "Warm & Sticky";
        return "Warm & Comfy";
    }
    if (temp < 18) return rh > 70 ? "Cold & Damp" : "Chilly & Dry";
    if (rh > 80) return "Sticky & Humid";
    if (rh < 30) return "Dry & Pleasant";
    return "Pleasant & Ideal";
}

function calculateZambrettiForecast(pressure, trend) {
    if (trend === 'Rising') {
        if (pressure > 1025) return "Settled Fine Weather";
        if (pressure > 1018) return "Fine Weather, Warmer";
        if (pressure > 1010) return "Fair Weather, Clearing";
        if (pressure > 1002) return "Showers, Improving Wind";
        if (pressure > 992)  return "Rainy, Clearing Soon";
        return "Stormy, Improving";
    } else if (trend === 'Falling') {
        if (pressure > 1025) return "Fine, Deteriorating";
        if (pressure > 1018) return "Cloudy, Wind Rising";
        if (pressure > 1010) return "Showers, Wind & Rain Impending";
        if (pressure > 1002) return "Persistent Rain, Deteriorating";
        if (pressure > 992)  return "Storm Warning! Heavy Precip";
        return "Severe Gale / Cyclonic Storm";
    } else {
        if (pressure > 1020) return "Settled, Sunny Skies";
        if (pressure > 1012) return "Mostly Fair, Some Clouds";
        if (pressure > 1004) return "Unsettled, Intermittent Showers";
        if (pressure > 995)  return "Rainy, Cool Weather";
        return "Persistent Stormy";
    }
}

function calculateMoonPhase(date) {
    const referenceDate = new Date('2000-01-06T18:14:00Z');
    const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000;
    const diff = date - referenceDate;
    const phase = (diff % lunarCycle) / lunarCycle;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

    const phases = [
        { icon: '🌑', name: 'New Moon', min: 0.00, max: 0.02 },
        { icon: '🌒', name: 'Waxing Crescent', min: 0.02, max: 0.175 },
        { icon: '🌓', name: 'First Quarter', min: 0.175, max: 0.25 },
        { icon: '🌔', name: 'Waxing Gibbous', min: 0.25, max: 0.425 },
        { icon: '🌕', name: 'Full Moon', min: 0.425, max: 0.52 },
        { icon: '🌖', name: 'Waning Gibbous', min: 0.52, max: 0.675 },
        { icon: '🌗', name: 'Last Quarter', min: 0.675, max: 0.75 },
        { icon: '🌘', name: 'Waning Crescent', min: 0.75, max: 0.925 },
        { icon: '🌑', name: 'New Moon', min: 0.925, max: 1.00 }
    ];

    const currentPhase = phases.find(p => phase >= p.min && phase < p.max) || { icon: '🌑', name: 'New Moon' };
    return {
        icon: currentPhase.icon,
        name: currentPhase.name,
        illumination: (illumination * 100).toFixed(1),
        rawPhase: phase
    };
}

function getMoonPhasePath(phaseProgress) {
    const p = phaseProgress;
    if (p <= 0.02 || p >= 0.98) {
        // New Moon: dark disk only
        return "";
    }
    if (p >= 0.48 && p <= 0.52) {
        // Full Moon: completely lit disk
        return "M 50,0 A 50,50 0 1,1 50,100 A 50,50 0 1,1 50,0 Z";
    }
    const x = Math.cos(2 * Math.PI * p);
    const rx = Math.max(0.1, 50 * Math.abs(x));
    if (p < 0.5) {
        // Waxing (right side lit)
        const sweep = p < 0.25 ? 0 : 1;
        return `M 50,0 A 50,50 0 0,1 50,100 A ${rx},50 0 0,${sweep} 50,0 Z`;
    } else {
        // Waning (left side lit)
        const sweep = p < 0.75 ? 1 : 0;
        return `M 50,0 A 50,50 0 0,0 50,100 A ${rx},50 0 0,${sweep} 50,0 Z`;
    }
}

function getNextFullMoonDate(now, phaseProgress) {
    const p = phaseProgress;
    let daysUntilFull = 0;
    if (p < 0.5) {
        daysUntilFull = (0.5 - p) * 29.53059;
    } else {
        daysUntilFull = (1.5 - p) * 29.53059;
    }
    const fullMoonDate = new Date(now.getTime() + daysUntilFull * 24 * 60 * 60 * 1000);
    const options = { month: 'short', day: 'numeric' };
    return fullMoonDate.toLocaleDateString('en-IN', options);
}

function getMoonTimes(rawPhase, sunriseSec, sunsetSec) {
    const sunriseHour = sunriseSec ? new Date(sunriseSec * 1000).getHours() + new Date(sunriseSec * 1000).getMinutes() / 60 : 5.25;
    const moonriseHour = (sunriseHour + rawPhase * 24) % 24;
    const moonsetHour = (moonriseHour + 13.0) % 24;
    return {
        riseHour: moonriseHour,
        setHour: moonsetHour,
        riseStr: formatHourAMPM(moonriseHour),
        setStr: formatHourAMPM(moonsetHour)
    };
}

function formatHourAMPM(hourFraction) {
    const totalMinutes = Math.round(hourFraction * 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
}

function convertDegToDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// 2. Celestial Sky Dome Path Solver (Parabola Equation)
function updateCelestialPosition(sunriseSec, sunsetSec, moon) {
    if (!sunElementEl || !moonElementEl || !skyBackdropEl) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // A. Adapt Sky Gradient theme based on current hour
    skyBackdropEl.className = 'sky-dome-bg';
    if (currentHour >= 4 && currentHour < 6) {
        skyBackdropEl.classList.add('sky-sunrise');
    } else if (currentHour >= 6 && currentHour < 17) {
        skyBackdropEl.classList.add('sky-day');
    } else if (currentHour >= 17 && currentHour < 19) {
        skyBackdropEl.classList.add('sky-sunset');
    } else {
        skyBackdropEl.classList.add('sky-night');
    }
    
    // ALWAYS update moon phase icons and details (for persistent card stats display)
    if (moonCharEl) moonCharEl.textContent = moon.icon;
    
    // Render dynamic Moon Phase graphic and textual metrics
    if (moonLitPathEl) {
        const pathD = getMoonPhasePath(moon.rawPhase);
        moonLitPathEl.setAttribute('d', pathD);
    }
    if (moonIllumPctEl) {
        const illumVal = Math.round(parseFloat(moon.illumination));
        moonIllumPctEl.textContent = `${illumVal}%`;
    }
    if (moonPhaseNameEl) {
        moonPhaseNameEl.textContent = moon.name;
    }
    if (nextFullMoonValEl) {
        const nextFull = getNextFullMoonDate(now, moon.rawPhase);
        nextFullMoonValEl.textContent = nextFull;
    }
    
    if (!sunriseSec || !sunsetSec) return;
    
    const sunrise = new Date(sunriseSec * 1000);
    const sunset = new Date(sunsetSec * 1000);
    
    // Helper to format times into standard 12-hour AM/PM with custom layout support
    const formatTimeHTML = (date) => {
        let hrs = date.getHours();
        const mins = date.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12;
        const minsStr = mins < 10 ? '0' + mins : mins;
        return `${hrs}:${minsStr} <span class="ampm-small">${ampm}</span>`;
    };
    
    if (sunriseLblEl) sunriseLblEl.innerHTML = formatTimeHTML(sunrise);
    if (sunsetLblEl) sunsetLblEl.innerHTML = formatTimeHTML(sunset);
    
    const daylightMs = sunset - sunrise;
    const dlHrs = Math.floor(daylightMs / 3600000);
    const dlMins = Math.floor((daylightMs % 3600000) / 60000);
    const daylightText = `${dlHrs} hrs ${dlMins} mins`;
    if (daylightLblEl) daylightLblEl.textContent = daylightText;
    const daylightStatEl = document.getElementById('daylight-lbl');
    if (daylightStatEl) daylightStatEl.textContent = `${dlHrs}h ${dlMins}m`;
    
    // ----------------------------------------------------
    // Sun Parabolic Orbit Coordinate Solver (24h loop)
    // ----------------------------------------------------
    let isDay = (now >= sunrise && now <= sunset);
    let sunT = 0;
    
    if (isDay) {
        // Daylight: sunT maps linearly between sunrise (0.323) and sunset (0.677)
        const progress = (now - sunrise) / daylightMs;
        sunT = 0.323 + progress * (0.677 - 0.323);
    } else {
        // Night: sunT maps through the under-horizon parabolic portion
        let lastSunset = sunset;
        let nextSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
        if (now < sunrise) {
            lastSunset = new Date(sunset.getTime() - 24 * 60 * 60 * 1000);
            nextSunrise = sunrise;
        }
        const nightDuration = nextSunrise - lastSunset;
        const progress = (now - lastSunset) / nightDuration;
        
        if (progress < 0.5) {
            sunT = 0.677 + progress * 2 * (1.0 - 0.677);
        } else {
            sunT = 0.0 + (progress - 0.5) * 2 * 0.323;
        }
    }
    
    // Map sunT to new orbit geometry:
    //   Above horizon (sunT 0.323→0.677): Bezier arc P0=(120,110) CP=(200,-50) P1=(280,110)
    //   Below horizon right tail: from (280,110) → (385,185)
    //   Below horizon left tail:  from (15,185) → (120,110)
    // ViewBox: 400×190
    let sunX_svg, sunY_svg;
    if (isDay) {
        const t = (now - sunrise) / daylightMs; // 0..1
        // Quadratic Bezier: P=(1-t)²P0 + 2(1-t)t·CP + t²P1
        sunX_svg = Math.pow(1-t,2)*120 + 2*(1-t)*t*200 + Math.pow(t,2)*280;
        sunY_svg = Math.pow(1-t,2)*110 + 2*(1-t)*t*(-50) + Math.pow(t,2)*110;
    } else {
        // Night: right tail then left tail
        let lastSunset = sunset;
        let nextSunrise = new Date(sunrise.getTime() + 24*60*60*1000);
        if (now < sunrise) {
            lastSunset = new Date(sunset.getTime() - 24*60*60*1000);
            nextSunrise = sunrise;
        }
        const nightDuration = nextSunrise - lastSunset;
        const progress = (now - lastSunset) / nightDuration;
        if (progress < 0.5) {
            const tp = progress * 2; // 0..1 along right tail
            sunX_svg = 280 + tp * (385 - 280);
            sunY_svg = 110 + tp * (185 - 110);
        } else {
            const tp = (progress - 0.5) * 2; // 0..1 along left tail (bottom→node)
            sunX_svg = 15 + tp * (120 - 15);
            sunY_svg = 185 - tp * (185 - 110);
        }
    }
    const sunXpct = (sunX_svg / 400) * 100;
    const sunYpct = (sunY_svg / 190) * 100;
    sunElementEl.style.left = `${sunXpct}%`;
    sunElementEl.style.top = `${sunYpct}%`;
    
    // ----------------------------------------------------
    // Moon Parabolic Orbit Coordinate Solver & Moon Times
    // ----------------------------------------------------
    const moonTimes = getMoonTimes(moon.rawPhase, sunriseSec, sunsetSec);
    
    if (moonriseLblEl) moonriseLblEl.innerHTML = moonTimes.riseStr.replace(" AM", ' <span class="ampm-small">AM</span>').replace(" PM", ' <span class="ampm-small">PM</span>');
    if (moonsetLblEl) moonsetLblEl.innerHTML = moonTimes.setStr.replace(" AM", ' <span class="ampm-small">AM</span>').replace(" PM", ' <span class="ampm-small">PM</span>');
    if (moonDurationLblEl) moonDurationLblEl.textContent = "13 hrs 0 mins";
    
    const moonrise = new Date(now);
    const riseHours = Math.floor(moonTimes.riseHour);
    const riseMins = Math.round((moonTimes.riseHour - riseHours) * 60);
    moonrise.setHours(riseHours, riseMins, 0, 0);
    
    const moonset = new Date(now);
    const setHours = Math.floor(moonTimes.setHour);
    const setMins = Math.round((moonTimes.setHour - setHours) * 60);
    moonset.setHours(setHours, setMins, 0, 0);
    
    let isMoonUp = false;
    let moonProgress = 0;
    
    if (moonset > moonrise) {
        if (now >= moonrise && now <= moonset) {
            isMoonUp = true;
            moonProgress = (now - moonrise) / (moonset - moonrise);
        } else {
            isMoonUp = false;
            if (now < moonrise) {
                const prevSet = new Date(moonset.getTime() - 24 * 60 * 60 * 1000);
                moonProgress = (now - prevSet) / (moonrise - prevSet);
            } else {
                const nextRise = new Date(moonrise.getTime() + 24 * 60 * 60 * 1000);
                moonProgress = (now - moonset) / (nextRise - moonset);
            }
        }
    } else {
        if (now >= moonrise || now <= moonset) {
            isMoonUp = true;
            const actualRise = now <= moonset ? new Date(moonrise.getTime() - 24 * 60 * 60 * 1000) : moonrise;
            const actualSet = now <= moonset ? moonset : new Date(moonset.getTime() + 24 * 60 * 60 * 1000);
            moonProgress = (now - actualRise) / (actualSet - actualRise);
        } else {
            isMoonUp = false;
            const nextRise = moonrise;
            const prevSet = moonset;
            moonProgress = (now - prevSet) / (nextRise - prevSet);
        }
    }
    
    let moonT = 0;
    if (isMoonUp) {
        moonT = 0.323 + moonProgress * (0.677 - 0.323);
    } else {
        if (moonProgress < 0.5) {
            moonT = 0.323 - moonProgress * 2 * 0.323;
        } else {
            moonT = 1.0 - (moonProgress - 0.5) * 2 * (1.0 - 0.677);
        }
    }
    
    // Map moonT to same orbit geometry as sun
    let moonX_svg, moonY_svg;
    if (isMoonUp) {
        const t = moonProgress; // 0..1
        moonX_svg = Math.pow(1-t,2)*120 + 2*(1-t)*t*200 + Math.pow(t,2)*280;
        moonY_svg = Math.pow(1-t,2)*110 + 2*(1-t)*t*(-50) + Math.pow(t,2)*110;
    } else {
        // Below horizon: show approaching moonrise on LEFT tail
        if (moonProgress < 0.5) {
            // Left tail: bottom (15,185) → left horizon node (120,110) — approaching rise
            const tp = moonProgress * 2;
            moonX_svg = 15 + tp * (120 - 15);
            moonY_svg = 185 - tp * (185 - 110);
        } else {
            // Right tail: right horizon node (280,110) → bottom (385,185) — just set
            const tp = (moonProgress - 0.5) * 2;
            moonX_svg = 280 + tp * (385 - 280);
            moonY_svg = 110 + tp * (185 - 110);
        }
    }
    const moonXpct = (moonX_svg / 400) * 100;
    const moonYpct = (moonY_svg / 190) * 100;
    moonElementEl.style.left = `${moonXpct}%`;
    moonElementEl.style.top = `${moonYpct}%`;
}

// 3. Rainfall Histogram Engine — rolling 24-point bar chart
function updateRainHistogram(currentMmPerHour) {
    const histEl = document.getElementById('rain-histogram');
    if (!histEl) return;

    // Push latest reading and trim to 24 points
    rainfallHistory.push(currentMmPerHour);
    if (rainfallHistory.length > 24) rainfallHistory.shift();

    const maxVal = Math.max(...rainfallHistory, 0.5); // minimum scale 0.5mm
    histEl.innerHTML = '';

    rainfallHistory.forEach((val, i) => {
        const bar = document.createElement('div');
        bar.className = 'rain-bar';
        const heightPct = Math.max((val / maxVal) * 100, 2);
        bar.style.height = `${heightPct}%`;

        // Colour: blue tones scaling with intensity
        const alpha = 0.3 + (val / maxVal) * 0.7;
        if (val >= 10) {
            bar.style.background = `rgba(99, 102, 241, ${alpha})`;
            bar.style.boxShadow = `0 0 6px rgba(99,102,241,0.6)`;
        } else if (val >= 2) {
            bar.style.background = `rgba(56, 189, 248, ${alpha})`;
            bar.style.boxShadow = `0 0 4px rgba(56,189,248,0.4)`;
        } else if (val > 0) {
            bar.style.background = `rgba(148, 163, 184, ${alpha})`;
        } else {
            bar.style.background = 'rgba(255,255,255,0.05)';
        }

        // Tooltip
        bar.title = `${val.toFixed(2)} mm/h`;
        bar.style.animationDelay = `${i * 20}ms`;
        histEl.appendChild(bar);
    });
}

// 4. Falling Rain Animation Engine
function updateRainfallAnimation(intensity) {
    if (!rainAnimationLayerEl) return;
    
    // Clear previous drops
    rainAnimationLayerEl.innerHTML = '';
    
    let particleCount = 0;
    if (intensity === 'Light Rain') particleCount = 20;
    else if (intensity === 'Moderate Rain') particleCount = 50;
    else if (intensity === 'Heavy Rain') particleCount = 100;
    
    if (particleCount > 0) {
        rainAnimationLayerEl.parentElement.style.opacity = '1';
        for (let i = 0; i < particleCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDelay = `${Math.random() * 1.5}s`;
            drop.style.animationDuration = `${0.3 + Math.random() * 0.6}s`;
            rainAnimationLayerEl.appendChild(drop);
        }
    } else {
        rainAnimationLayerEl.parentElement.style.opacity = '0.3';
    }
}

// 4. Alerts Processing Engine
function processSystemAlerts(data, heatIndex, aqiScore) {
    if (!safetyPanelEl || !safetyIconEl || !safetyTitleEl || !alertMessagesBoxEl) return;
    
    let messages = [];
    
    if (heatIndex > 38.0) {
        messages.push(`🚨 <strong>Heat Index Emergency:</strong> Real feel is ${heatIndex.toFixed(1)}°C. Highly oppressive outdoor state.`);
    }
    if (data.pm2_5 > 60 || aqiScore > 150) {
        messages.push(`🌫️ <strong>Poor Air Quality Advisory:</strong> PM2.5 at ${data.pm2_5.toFixed(1)} µg/m³. Respiratory risk for sensitive groups.`);
    }
    if (data.coLevel > 15) {
        messages.push(`🚨 <strong>Gas Alert (CO):</strong> Carbon Monoxide level is ${data.coLevel.toFixed(1)} ppm. Inspect ventilation.`);
    }
    if (data.rainfall1Hour > 12.0) {
        messages.push(`🌧️ <strong>Heavy Rainfall Warnings:</strong> precipitation at ${data.rainfall1Hour.toFixed(1)} mm/h. Watch for flooding.`);
    }
    if (data.windSpeed > 30) {
        messages.push(`🌪️ <strong>High Wind Warning:</strong> Speeds exceed ${data.windSpeed.toFixed(1)} km/h. Secure loose outdoor objects.`);
    }
    
    if (messages.length > 0) {
        safetyPanelEl.className = 'safety-alert-console danger';
        safetyIconEl.className = 'fa-solid fa-circle-exclamation';
        safetyTitleEl.textContent = `${messages.length} Atmospheric Warnings`;
        
        alertMessagesBoxEl.innerHTML = messages.map(msg => `
            <div class="alert-message-item">${msg}</div>
        `).join('');
    } else {
        safetyPanelEl.className = 'safety-alert-console';
        safetyIconEl.className = 'fa-solid fa-circle-check';
        safetyTitleEl.textContent = 'Atmospheric State Clear';
        alertMessagesBoxEl.innerHTML = '<div class="alert-message-item">No active meteorological alerts are currently registered.</div>';
    }
}

// 5. Google Sheets Data Fetcher
async function fetchSheetsData() {
    try {
        console.log('LED Dashboard: Fetching from Google Sheets...');
        const response = await fetch(APP_SCRIPT_URL);
        if (!response.ok) throw new Error(`Sheets fetch status: ${response.status}`);
        
        const result = await response.json();
        if (result.status === 'success' && result.latestReading) {
            const reading = result.latestReading;
            const stats = result.statistics || {};
            
            let currentPressure = parseFloat(reading[3]) || 1013;
            if (weatherDataCache.lastPressure !== null) {
                let diff = currentPressure - weatherDataCache.lastPressure;
                if (diff > 0.3) weatherDataCache.pressureTrend = 'Rising';
                else if (diff < -0.3) weatherDataCache.pressureTrend = 'Falling';
                else weatherDataCache.pressureTrend = 'Steady';
            }
            weatherDataCache.lastPressure = currentPressure;
            
            return {
                timestamp: reading[0],
                temperature: parseFloat(reading[1]) || 0,
                humidity: parseFloat(reading[2]) || 0,
                pressure: currentPressure,
                gasResistance: parseFloat(reading[4]) || 0,
                pm1_0: parseFloat(reading[5]) || 0,
                pm2_5: parseFloat(reading[6]) || 0,
                pm10: parseFloat(reading[7]) || 0,
                windSpeed: (parseFloat(reading[8]) * 3.6) || 0, // convert m/s to km/h
                windDirection: reading[9] || "N",
                windDirectionDegrees: parseFloat(reading[10]) || 0,
                coLevel: parseFloat(reading[11]) || 0,
                no2Level: parseFloat(reading[12]) || 0,
                altitude: parseFloat(reading[13]) || 0,
                rainfall: parseFloat(reading[14]) || 0,
                rainfall1Hour: parseFloat(reading[15]) || 0,
                highTemp: stats.temperature ? parseFloat(stats.temperature.max) : (parseFloat(reading[1]) + 4),
                lowTemp: stats.temperature ? parseFloat(stats.temperature.min) : (parseFloat(reading[1]) - 4),
                isLive: true
            };
        }
        throw new Error('Google Sheets responded with invalid structure.');
    } catch (e) {
        console.error('LED Dashboard Sheets fetch error:', e);
        return null;
    }
}

// 6. OpenWeather Backup Fetcher
async function fetchOpenWeatherData() {
    try {
        console.log('LED Dashboard: Fetching regional backup (OpenWeather)...');
        const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );
        if (!weatherRes.ok) throw new Error(`OpenWeather weather error: ${weatherRes.status}`);
        const wData = await weatherRes.json();
        
        const aqiRes = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${OPENWEATHER_API_KEY}`
        );
        let pollutionData = null;
        if (aqiRes.ok) pollutionData = await aqiRes.json();
        
        return {
            temperature: wData.main.temp,
            humidity: wData.main.humidity,
            pressure: wData.main.pressure,
            windSpeed: (wData.wind.speed * 3.6).toFixed(1),
            windDirectionDegrees: wData.wind.deg || 0,
            windGust: wData.wind.gust ? (wData.wind.gust * 3.6).toFixed(1) : (wData.wind.speed * 3.6).toFixed(1),
            rainfall: wData.rain ? (wData.rain["1h"] || 0) : 0,
            sunrise: wData.sys.sunrise,
            sunset: wData.sys.sunset,
            pm25: pollutionData?.list?.[0]?.components?.pm2_5 || 22,
            pm10: pollutionData?.list?.[0]?.components?.pm10 || 36,
            coLevel: pollutionData?.list?.[0]?.components?.co ? (pollutionData.list[0].components.co / 1000).toFixed(3) : 0.32,
            no2Level: pollutionData?.list?.[0]?.components?.no2 ? (pollutionData.list[0].components.no2 / 1000).toFixed(4) : 0.012,
            aqi: pollutionData?.list?.[0]?.main?.aqi || 2,
            isBackup: true
        };
    } catch (e) {
        console.error('LED Dashboard OpenWeather API error:', e);
        return null;
    }
}

// 7. Core Telemetry Resolution
async function gatherTelemetry() {
    const sheets = await fetchSheetsData();
    const backup = await fetchOpenWeatherData();
    
    const ring = document.getElementById('status-ring');
    const statusText = document.getElementById('connection-status');
    
    if (sheets) {
        if (ring) ring.className = 'pulse-ring green';
        if (statusText) statusText.textContent = 'Live Station Connected';
        weatherDataCache.sheetsData = sheets;
        
        // Incorporate OpenWeather astronomical metrics if sheets doesn't provide them
        return {
            ...sheets,
            sunrise: backup ? backup.sunrise : Math.floor(new Date().setHours(5, 15) / 1000),
            sunset: backup ? backup.sunset : Math.floor(new Date().setHours(18, 30) / 1000),
            sourceStr: "Live Ground Station"
        };
    } else if (backup) {
        if (ring) ring.className = 'pulse-ring green';
        if (statusText) statusText.textContent = 'Backup Regional Data';
        
        return {
            temperature: backup.temperature,
            humidity: backup.humidity,
            pressure: backup.pressure,
            gasResistance: 42000,
            pm1_0: backup.pm25 * 0.7,
            pm2_5: backup.pm25,
            pm10: backup.pm10,
            windSpeed: parseFloat(backup.windSpeed),
            windDirection: convertDegToDirection(backup.windDirectionDegrees),
            windDirectionDegrees: backup.windDirectionDegrees,
            coLevel: parseFloat(backup.coLevel),
            no2Level: parseFloat(backup.no2Level),
            altitude: 97.0,
            rainfall: backup.rainfall,
            rainfall1Hour: backup.rainfall,
            highTemp: backup.temperature + 4,
            lowTemp: backup.temperature - 4,
            sunrise: backup.sunrise,
            sunset: backup.sunset,
            sourceStr: "Backup API"
        };
    } else {
        // Local simulation fallback
        if (ring) ring.className = 'pulse-ring red';
        if (statusText) statusText.textContent = 'Telemetry Simulation Mode';
        
        const hr = new Date().getHours();
        const baseTemp = 24.5 + 7.5 * Math.sin((hr - 6) * Math.PI / 12);
        
        return {
            temperature: baseTemp,
            humidity: 62 + 18 * Math.sin(hr * Math.PI / 12),
            pressure: 1010.5 + Math.cos(hr * Math.PI / 12),
            gasResistance: 36000,
            pm1_0: 10,
            pm2_5: 24,
            pm10: 42,
            windSpeed: 7.2 + 3.8 * Math.sin(hr * Math.PI / 12),
            windDirection: "NNE",
            windDirectionDegrees: 22.5,
            coLevel: 0.28,
            no2Level: 0.009,
            altitude: 97.0,
            rainfall: hr > 15 ? 0.8 : 0.0,
            rainfall1Hour: hr > 15 ? 0.2 : 0.0,
            highTemp: 32.5,
            lowTemp: 22.0,
            sunrise: Math.floor(new Date().setHours(5, 15) / 1000),
            sunset: Math.floor(new Date().setHours(18, 30) / 1000),
            sourceStr: "Offline Simulator"
        };
    }
}

// 8. Render Metrics on Screen
function renderTelemetry(data) {
    console.log('LED Dashboard: Rendering data:', data);
    weatherDataCache.activeTelemetry = data;
    
    // Core Temp
    if (currentTempEl) currentTempEl.textContent = data.temperature.toFixed(1);
    if (lowTempEl) lowTempEl.textContent = `${data.lowTemp.toFixed(1)}°C`;
    if (highTempEl) highTempEl.textContent = `${data.highTemp.toFixed(1)}°C`;
    
    const heatIndex = calculateHeatIndex(data.temperature, data.humidity);
    if (feelsTempEl) feelsTempEl.textContent = `${heatIndex.toFixed(1)}°C`;
    
    const comfort = getComfortDescription(data.temperature, data.humidity);
    if (comfortTextEl) comfortTextEl.textContent = comfort;
    
    // Progress fill for Temp slider
    if (tempProgressEl) {
        const total = data.highTemp - data.lowTemp;
        const pct = total > 0 ? ((data.temperature - data.lowTemp) / total) * 100 : 50;
        tempProgressEl.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    }
    
    // Atmosphere State
    if (humidityValEl) humidityValEl.textContent = `${data.humidity.toFixed(0)}%`;
    if (humidityProgressEl) humidityProgressEl.style.width = `${data.humidity}%`;
    
    if (pressureValEl) pressureValEl.textContent = `${data.pressure.toFixed(1)} hPa`;
    if (pressureTrendEl) pressureTrendEl.textContent = weatherDataCache.pressureTrend;
    if (pressureProgressEl) {
        const pPct = ((data.pressure - 970) / 60) * 100;
        pressureProgressEl.style.width = `${Math.min(Math.max(pPct, 0), 100)}%`;
    }
    if (altitudeValEl) altitudeValEl.textContent = `${data.altitude.toFixed(0)} m`;
    const vocVal = calculateVOC(data.gasResistance);
    if (gasValEl) gasValEl.textContent = `${vocVal.toFixed(2)} ppm`;
    
    // Zambretti Forecast
    const forecast = calculateZambrettiForecast(data.pressure, weatherDataCache.pressureTrend);
    if (forecastTextEl) forecastTextEl.textContent = forecast;
    if (quickWeatherTextEl) quickWeatherTextEl.textContent = forecast;
    
    if (forecastIconBoxEl) {
        if (forecast.includes("Fine") || forecast.includes("Sunny")) {
            forecastIconBoxEl.innerHTML = '<i class="fa-solid fa-sun forecast-dynamic-icon float-animation" style="color:#fb923c"></i>';
        } else if (forecast.includes("Fair") || forecast.includes("Mostly")) {
            forecastIconBoxEl.innerHTML = '<i class="fa-solid fa-cloud-sun forecast-dynamic-icon float-animation" style="color:#60a5fa"></i>';
        } else if (forecast.includes("Showers") || forecast.includes("Rain")) {
            forecastIconBoxEl.innerHTML = '<i class="fa-solid fa-cloud-showers-heavy forecast-dynamic-icon float-animation" style="color:#818cf8"></i>';
        } else {
            forecastIconBoxEl.innerHTML = '<i class="fa-solid fa-cloud-bolt forecast-dynamic-icon float-animation" style="color:#f87171"></i>';
        }
    }
    
    // Rain Widget
    if (rainAccumEl) rainAccumEl.textContent = data.rainfall.toFixed(2);
    if (rainHourlyEl) rainHourlyEl.textContent = `${data.rainfall1Hour.toFixed(2)} mm`;
    
    let rainIntensity = 'None';
    if (data.rainfall1Hour > 0 && data.rainfall1Hour <= 2.0) rainIntensity = 'Light Rain';
    else if (data.rainfall1Hour > 2.0 && data.rainfall1Hour <= 10.0) rainIntensity = 'Moderate Rain';
    else if (data.rainfall1Hour > 10.0) rainIntensity = 'Heavy Rain';
    
    if (rainIntensityBadgeEl) {
        rainIntensityBadgeEl.textContent = rainIntensity;
        if (rainIntensity === 'None') {
            rainIntensityBadgeEl.style.borderColor = 'rgba(255,255,255,0.1)';
            rainIntensityBadgeEl.style.color = 'var(--text-secondary)';
        } else {
            rainIntensityBadgeEl.style.borderColor = 'rgba(129, 140, 248, 0.3)';
            rainIntensityBadgeEl.style.color = 'var(--color-indigo)';
        }
    }
    updateRainfallAnimation(rainIntensity);
    updateRainHistogram(data.rainfall1Hour);
    
    // Wind Telemetry
    if (compassSpeedEl) compassSpeedEl.textContent = data.windSpeed.toFixed(0);
    if (windAvgValEl) windAvgValEl.textContent = `${data.windSpeed.toFixed(1)} km/h`;
    if (windGustValEl) windGustValEl.textContent = `${(data.windSpeed * 1.25).toFixed(1)} km/h`;
    if (windDirDegEl) windDirDegEl.textContent = `${data.windDirection} (${data.windDirectionDegrees.toFixed(0)}°)`;
    
    if (windNeedleEl) {
        windNeedleEl.style.transform = `rotate(${data.windDirectionDegrees}deg)`;
    }
    
    // Spinning anemometer proportional velocity
    if (windAnemometerCupsEl) {
        if (data.windSpeed > 0.8) {
            windAnemometerCupsEl.style.animation = "spinCups linear infinite";
            const duration = Math.max(0.12, 10 / data.windSpeed);
            windAnemometerCupsEl.style.animationDuration = `${duration}s`;
        } else {
            windAnemometerCupsEl.style.animation = "none";
        }
    }
    
    let windStrength = "Calm";
    if (data.windSpeed >= 5 && data.windSpeed < 15) windStrength = "Light Breeze";
    else if (data.windSpeed >= 15 && data.windSpeed < 28) windStrength = "Moderate Wind";
    else if (data.windSpeed >= 28 && data.windSpeed < 45) windStrength = "Strong Gale";
    else if (data.windSpeed >= 45) windStrength = "Storm Danger";
    
    if (windStrengthBadgeEl) {
        windStrengthBadgeEl.textContent = windStrength;
        if (windStrength === 'Calm') {
            windStrengthBadgeEl.style.borderColor = 'rgba(255,255,255,0.1)';
            windStrengthBadgeEl.style.color = 'var(--text-secondary)';
        } else if (windStrength.includes("Storm") || windStrength.includes("Gale")) {
            windStrengthBadgeEl.style.borderColor = 'rgba(248, 113, 113, 0.3)';
            windStrengthBadgeEl.style.color = 'var(--color-red)';
        } else {
            windStrengthBadgeEl.style.borderColor = 'rgba(34, 211, 238, 0.3)';
            windStrengthBadgeEl.style.color = 'var(--color-cyan)';
        }
    }
    
    // AQI Score
    let aqiScore = data.pm2_5 <= 30 ? (data.pm2_5 * 50 / 30) :
                   data.pm2_5 <= 60 ? (50 + (data.pm2_5 - 30) * 50 / 30) :
                   data.pm2_5 <= 90 ? (100 + (data.pm2_5 - 60) * 100 / 30) :
                   data.pm2_5 <= 120 ? (200 + (data.pm2_5 - 90) * 100 / 30) :
                   data.pm2_5 <= 250 ? (300 + (data.pm2_5 - 120) * 100 / 130) : 420;
                   
    aqiScore = Math.min(500, Math.max(0, Math.round(aqiScore)));
    if (aqiValEl) aqiValEl.textContent = aqiScore;
    
    if (aqiIndicatorPinEl) {
        const pinPercent = (aqiScore / 500) * 100;
        aqiIndicatorPinEl.style.left = `${Math.min(Math.max(pinPercent, 0), 99.5)}%`;
    }
    
    if (aqiStatusBadgeEl) {
        aqiStatusBadgeEl.style.color = '#fff';
        if (aqiScore <= 50) {
            aqiStatusBadgeEl.textContent = "Good";
            aqiStatusBadgeEl.style.background = 'var(--color-green)';
            if (aqiValEl) aqiValEl.style.color = 'var(--color-green)';
        } else if (aqiScore <= 100) {
            aqiStatusBadgeEl.textContent = "Satisfactory";
            aqiStatusBadgeEl.style.background = 'var(--color-yellow)';
            aqiStatusBadgeEl.style.color = '#000';
            if (aqiValEl) aqiValEl.style.color = 'var(--color-yellow)';
        } else if (aqiScore <= 200) {
            aqiStatusBadgeEl.textContent = "Moderate";
            aqiStatusBadgeEl.style.background = 'var(--color-orange)';
            if (aqiValEl) aqiValEl.style.color = 'var(--color-orange)';
        } else if (aqiScore <= 300) {
            aqiStatusBadgeEl.textContent = "Poor";
            aqiStatusBadgeEl.style.background = 'var(--color-red)';
            if (aqiValEl) aqiValEl.style.color = 'var(--color-red)';
        } else {
            aqiStatusBadgeEl.textContent = "Severe";
            aqiStatusBadgeEl.style.background = 'var(--color-purple)';
            if (aqiValEl) aqiValEl.style.color = 'var(--color-purple)';
        }
    }
    
    // PM levels
    if (pm25ValEl) pm25ValEl.textContent = `${data.pm2_5.toFixed(1)} µg/m³`;
    if (pm25ProgressEl) pm25ProgressEl.style.width = `${Math.min((data.pm2_5 / 250) * 100, 100)}%`;
    if (pm10ValEl) pm10ValEl.textContent = `${data.pm10.toFixed(1)} µg/m³`;
    if (pm10ProgressEl) pm10ProgressEl.style.width = `${Math.min((data.pm10 / 430) * 100, 100)}%`;
    
    // Gases
    if (coValEl) coValEl.textContent = `${data.coLevel.toFixed(2)} ppm`;
    if (no2ValEl) no2ValEl.textContent = `${data.no2Level.toFixed(3)} ppm`;
    
    // Emergency alerts panel
    processSystemAlerts(data, heatIndex, aqiScore);
    
    // Moon phase & Sun Orbit tracking
    const moon = calculateMoonPhase(new Date());
    updateCelestialPosition(data.sunrise, data.sunset, moon);
    
    // Footer sync stamp
    if (dataSourceMetaEl) {
        dataSourceMetaEl.textContent = `${data.sourceStr} | Purulia Station (Lat: ${LATITUDE.toFixed(3)}, Lon: ${LONGITUDE.toFixed(3)}) | Sync: ${new Date().toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}`;
    }
}

// 9. Main Refresh Cycle
async function refreshDashboard() {
    try {
        const data = await gatherTelemetry();
        renderTelemetry(data);
    } catch (e) {
        console.error('Critical telemetry refresh error:', e);
    }
}

// Initialization Entrypoint
function init() {
    console.log('Initializing Giant LED Weather Station Dashboard...');
    
    // 1. Setup DOMElements & Scale listeners
    initDOMElements();
    adjustScale();
    window.addEventListener('resize', adjustScale);
    
    // 2. Start digital clock
    updateTime();
    setInterval(updateTime, 1000);
    
    // 3. Initiate first refresh and setup 30s polling
    refreshDashboard();
    setInterval(refreshDashboard, 30000);
}

window.onload = init;
