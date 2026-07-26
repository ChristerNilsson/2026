(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = {
    target: null, current: null, watchId: null, lastBearingBand: null, lastDistance: null,
    targetBearing: null, heading: null, tilted: false, orientationListening: false,
    audioQueue: [], audioPlaying: false
  };
  const audioPlayer = new Audio();

  function parseCoordinate(value) {
    const sweref = parseMinKartaLink(value);
    if (sweref) return { ...toWgs84(sweref.northing, sweref.easting), source: "sweref" };
    const matches = value.trim().match(/[+-]?\d+(?:[.,]\d+)?/g) || [];
    const parts = matches.map((part) => Number(part.replace(",", ".")));
    if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
    const [lat, lon] = parts;
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { lat, lon } : null;
  }

  function toRad(deg) { return deg * Math.PI / 180; }
  function toDeg(rad) { return rad * 180 / Math.PI; }
  function navigationData(from, to) {
    const radius = 6371008.8, p1 = toRad(from.lat), p2 = toRad(to.lat);
    const dp = toRad(to.lat - from.lat), dl = toRad(to.lon - from.lon);
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    const distance = radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return { distance, bearing: (toDeg(Math.atan2(y, x)) + 360) % 360 };
  }

  // Lantmäteriets officiella Gauss–Krüger-parametrar för SWEREF 99 TM.
  function toSweref99TM(lat, lon) {
    const axis = 6378137.0, flattening = 1 / 298.257222101, centralMeridian = 15.0;
    const scale = 0.9996, falseNorthing = 0, falseEasting = 500000;
    const e2 = flattening * (2 - flattening), n = flattening / (2 - flattening);
    const aRoof = axis / (1 + n) * (1 + n ** 2 / 4 + n ** 4 / 64);
    const A = e2, B = (5 * e2 ** 2 - e2 ** 3) / 6, C = (104 * e2 ** 3 - 45 * e2 ** 4) / 120, D = (1237 * e2 ** 4) / 1260;
    const beta1 = n / 2 - 2 * n ** 2 / 3 + 5 * n ** 3 / 16 + 41 * n ** 4 / 180;
    const beta2 = 13 * n ** 2 / 48 - 3 * n ** 3 / 5 + 557 * n ** 4 / 1440;
    const beta3 = 61 * n ** 3 / 240 - 103 * n ** 4 / 140, beta4 = 49561 * n ** 4 / 161280;
    const phi = toRad(lat), lambdaDelta = toRad(lon - centralMeridian);
    const phiStar = phi - Math.sin(phi) * Math.cos(phi) * (A + B * Math.sin(phi) ** 2 + C * Math.sin(phi) ** 4 + D * Math.sin(phi) ** 6);
    const xiPrime = Math.atan(Math.tan(phiStar) / Math.cos(lambdaDelta));
    const etaPrime = Math.atanh(Math.cos(phiStar) * Math.sin(lambdaDelta));
    const x = scale * aRoof * (xiPrime + beta1 * Math.sin(2 * xiPrime) * Math.cosh(2 * etaPrime) + beta2 * Math.sin(4 * xiPrime) * Math.cosh(4 * etaPrime) + beta3 * Math.sin(6 * xiPrime) * Math.cosh(6 * etaPrime) + beta4 * Math.sin(8 * xiPrime) * Math.cosh(8 * etaPrime)) + falseNorthing;
    const y = scale * aRoof * (etaPrime + beta1 * Math.cos(2 * xiPrime) * Math.sinh(2 * etaPrime) + beta2 * Math.cos(4 * xiPrime) * Math.sinh(4 * etaPrime) + beta3 * Math.cos(6 * xiPrime) * Math.sinh(6 * etaPrime) + beta4 * Math.cos(8 * xiPrime) * Math.sinh(8 * etaPrime)) + falseEasting;
    return { northing: Math.round(x), easting: Math.round(y) };
  }

  function parseMinKartaLink(value) {
    if (!/minkarta\.lantmateriet\.se/i.test(value)) return null;
    const eastMatch = value.match(/[?&]e=(-?\d+(?:\.\d+)?)/i);
    const northMatch = value.match(/[?&]n=(-?\d+(?:\.\d+)?)/i);
    if (!eastMatch || !northMatch) return null;
    const easting = Number(eastMatch[1]), northing = Number(northMatch[1]);
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) return null;
    if (easting < 213000 || easting > 861000 || northing < 6105000 || northing > 7794100) return null;
    return { easting, northing };
  }

  function toWgs84(northing, easting) {
    const axis = 6378137.0, flattening = 1 / 298.257222101, centralMeridian = 15.0;
    const scale = 0.9996, falseNorthing = 0, falseEasting = 500000;
    const e2 = flattening * (2 - flattening), n = flattening / (2 - flattening);
    const aRoof = axis / (1 + n) * (1 + n ** 2 / 4 + n ** 4 / 64);
    const delta1 = n / 2 - 2 * n ** 2 / 3 + 37 * n ** 3 / 96 - n ** 4 / 360;
    const delta2 = n ** 2 / 48 + n ** 3 / 15 - 437 * n ** 4 / 1440;
    const delta3 = 17 * n ** 3 / 480 - 37 * n ** 4 / 840;
    const delta4 = 4397 * n ** 4 / 161280;
    const A = e2 + e2 ** 2 + e2 ** 3 + e2 ** 4;
    const B = -(7 * e2 ** 2 + 17 * e2 ** 3 + 30 * e2 ** 4) / 6;
    const C = (224 * e2 ** 3 + 889 * e2 ** 4) / 120;
    const D = -(4279 * e2 ** 4) / 1260;
    const xi = (northing - falseNorthing) / (scale * aRoof);
    const eta = (easting - falseEasting) / (scale * aRoof);
    const xiPrime = xi
      - delta1 * Math.sin(2 * xi) * Math.cosh(2 * eta)
      - delta2 * Math.sin(4 * xi) * Math.cosh(4 * eta)
      - delta3 * Math.sin(6 * xi) * Math.cosh(6 * eta)
      - delta4 * Math.sin(8 * xi) * Math.cosh(8 * eta);
    const etaPrime = eta
      - delta1 * Math.cos(2 * xi) * Math.sinh(2 * eta)
      - delta2 * Math.cos(4 * xi) * Math.sinh(4 * eta)
      - delta3 * Math.cos(6 * xi) * Math.sinh(6 * eta)
      - delta4 * Math.cos(8 * xi) * Math.sinh(8 * eta);
    const phiStar = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
    const deltaLambda = Math.atan(Math.sinh(etaPrime) / Math.cos(xiPrime));
    const lat = phiStar + Math.sin(phiStar) * Math.cos(phiStar)
      * (A + B * Math.sin(phiStar) ** 2 + C * Math.sin(phiStar) ** 4 + D * Math.sin(phiStar) ** 6);
    return { lat: toDeg(lat), lon: centralMeridian + toDeg(deltaLambda) };
  }

  function playNextClip() {
    const source = state.audioQueue.shift();
    if (!source) { state.audioPlaying = false; return; }
    state.audioPlaying = true;
    audioPlayer.src = source;
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {
      state.audioPlaying = false;
      state.audioQueue.length = 0;
    });
  }
  audioPlayer.addEventListener("ended", playNextClip);
  audioPlayer.addEventListener("error", playNextClip);
  function queueClips(sources, replace = false) {
    if (replace) {
      audioPlayer.pause();
      state.audioQueue.length = 0;
      state.audioPlaying = false;
    }
    state.audioQueue.push(...sources);
    if (!state.audioPlaying) playNextClip();
  }
  function unlockAudio() {
    if (audioPlayer.dataset.unlocked) return;
    audioPlayer.dataset.unlocked = "true";
    audioPlayer.src = "sounds/bearing/male/01.mp3";
    audioPlayer.volume = 0;
    const playing = audioPlayer.play();
    if (playing) playing.then(() => {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.volume = 1;
    }).catch(() => {
      audioPlayer.volume = 1;
      delete audioPlayer.dataset.unlocked;
    });
  }
  function speakBearing(bearing) {
    const rounded = Math.round(bearing / 10);
    const band = rounded === 0 ? 36 : rounded;
    if (state.lastBearingBand === null) state.lastBearingBand = band;
    else if (band !== state.lastBearingBand) {
      state.lastBearingBand = band;
      queueClips([`sounds/bearing/male/${String(band).padStart(2, "0")}.mp3`]);
    }
  }
  function thresholds(max) {
    const result = [];
    for (let p = 10; p <= max * 10; p *= 10) {
      for (let multiplier = 1; multiplier <= 9; multiplier += 1) result.push(multiplier * p);
    }
    return result;
  }
  function speakDistance(distance) {
    if (state.lastDistance !== null && distance < state.lastDistance) {
      const crossed = thresholds(state.lastDistance).filter((t) => state.lastDistance > t && distance <= t).sort((a,b) => b-a)[0];
      if (crossed && crossed <= 10000) queueClips([`sounds/distance/female/${crossed}.mp3`]);
    }
    state.lastDistance = distance;
  }
  function formatDistance(m) {
    return m >= 1000 ? { value: (m / 1000).toFixed(m >= 10000 ? 0 : 1).replace(".", ","), unit: "km" } : { value: Math.round(m), unit: "m" };
  }
  function relativeDirection(bearing, heading) {
    const direction = ((bearing - heading + 540) % 360) - 180;
    return direction === -180 ? 180 : direction;
  }
  function updateNeedle() {
    if (state.targetBearing === null) return;
    $("needle").style.transform = `rotate(${state.targetBearing}deg)`;
    updateRelativeGuide();
  }
  function updateRelativeGuide() {
    const guide = $("relativeGuide");
    if (state.targetBearing === null || state.heading === null || state.tilted) {
      guide.hidden = true;
      return;
    }
    const direction = relativeDirection(state.targetBearing, state.heading);
    guide.hidden = false;
    const rounded = Math.round(direction);
    $("relativeDegrees").textContent = `${rounded < 0 ? "−" : ""}${Math.abs(rounded)}°`;
    $("directionArrow").style.transform = `rotate(${direction}deg)`;
    guide.setAttribute("aria-label", rounded < 0
      ? `Sväng vänster ${Math.abs(rounded)} grader`
      : rounded > 0
        ? `Sväng höger ${rounded} grader`
        : "Fortsätt rakt fram");
  }
  function deviceHeading(event) {
    if (typeof event.webkitCompassHeading === "number") return event.webkitCompassHeading;
    if (event.absolute === true && typeof event.alpha === "number") return (360 - event.alpha) % 360;
    return null;
  }
  function isPhoneTilted(event) {
    const beta = typeof event.beta === "number" ? Math.abs(event.beta) : 0;
    const gamma = typeof event.gamma === "number" ? Math.abs(event.gamma) : 0;
    return beta > 30 || gamma > 30;
  }
  function onOrientation(event) {
    const heading = deviceHeading(event);
    if (heading === null) return;
    state.heading = heading;
    state.tilted = isPhoneTilted(event);
    $("compassStatus").hidden = true;
    updateRelativeGuide();
  }
  async function enableCompass() {
    $("compassStatus").hidden = false;
    if (!("DeviceOrientationEvent" in window)) {
      $("compassStatus").textContent = "Mobilkompass saknas";
      return;
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          $("compassStatus").textContent = "Kompassåtkomst nekad";
          return;
        }
      }
      if (!state.orientationListening) {
        window.addEventListener("deviceorientationabsolute", onOrientation, true);
        window.addEventListener("deviceorientation", onOrientation, true);
        state.orientationListening = true;
      }
      $("compassStatus").textContent = "Söker mobilens kompass …";
    } catch {
      $("compassStatus").textContent = "Kompass kunde inte startas";
    }
  }
  function minKartaUrl(sweref) {
    const params = new URLSearchParams({
      e: sweref.easting,
      n: sweref.northing,
      z: 14,
      mapprofile: "karta",
      layers: JSON.stringify([["3"], ["1"]])
    });
    return `https://minkarta.lantmateriet.se/plats/3006/v2.0/?${params}`;
  }
  function update(position) {
    const { latitude: lat, longitude: lon, accuracy } = position.coords;
    state.current = { lat, lon };
    const nav = navigationData(state.current, state.target), dist = formatDistance(nav.distance);
    state.targetBearing = nav.bearing;
    $("bearing").textContent = Math.round(nav.bearing).toString().padStart(3, "0");
    updateNeedle();
    $("distance").textContent = dist.value; $("distanceUnit").textContent = dist.unit;
    $("accuracy").textContent = `± ${Math.round(accuracy)} m`;
    $("currentCoordinates").textContent = `${lat.toFixed(5)} ${lon.toFixed(5)}`;
    $("gpsBadge").classList.add("live"); $("gpsBadge").innerHTML = "<i></i> GPS aktiv";
    $("googleLink").href = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${state.target.lat},${state.target.lon}&travelmode=walking`;
    if (nav.distance >= 10) speakBearing(nav.bearing);
    speakDistance(nav.distance);
  }
  function gpsError(error) {
    $("gpsBadge").classList.remove("live");
    $("gpsBadge").innerHTML = "<i></i> GPS saknas";
    const messages = {
      1: "Platsåtkomst nekad – tillåt Plats i Safaris webbplatsinställningar",
      2: "GPS-positionen är inte tillgänglig",
      3: "GPS-sökningen tog för lång tid – försök igen"
    };
    $("currentCoordinates").textContent = messages[error.code] || "Position kunde inte hämtas";
    $("accuracy").textContent = "—";
  }
  async function start() {
    const target = parseCoordinate($("coordinate").value);
    if (!target) {
      $("coordinate").classList.add("invalid"); $("inputHelp").classList.add("error");
      $("inputHelp").textContent = "Ange latitud och longitud, till exempel 59.2701, 18.1503."; return;
    }
    unlockAudio();
    state.target = target; state.lastBearingBand = null; state.lastDistance = null;
    state.targetBearing = null; state.heading = null; state.tilted = false;
    $("relativeGuide").hidden = true;
    $("coordinate").classList.remove("invalid"); $("inputHelp").classList.remove("error");
    if (target.source === "sweref") {
      $("coordinate").value = `${target.lat.toFixed(5)}, ${target.lon.toFixed(5)}`;
      $("inputHelp").textContent = "Min karta-länken är omvandlad från SWEREF 99 TM till WGS84.";
    } else {
      $("inputHelp").textContent = "Exempel: 59.2701, 18.1503 eller en delningslänk från Min karta";
    }
    $("navigation").hidden = false; $("targetLabel").textContent = `${target.lat.toFixed(5)}, ${target.lon.toFixed(5)}`;
    const sweref = toSweref99TM(target.lat, target.lon);
    $("minKartaLink").href = minKartaUrl(sweref);
    $("googleLink").href = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lon}`;
    $("currentCoordinates").textContent = "Söker GPS …";
    $("accuracy").textContent = "—";
    $("gpsBadge").classList.remove("live");
    $("gpsBadge").innerHTML = "<i></i> GPS söker";
    await enableCompass();
    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    if ("geolocation" in navigator) state.watchId = navigator.geolocation.watchPosition(update, gpsError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
    else gpsError({ code: 0 });
    $("navigation").scrollIntoView({ behavior: "smooth" });
  }

  $("targetForm").addEventListener("submit", (e) => { e.preventDefault(); start(); });
  $("coordinate").addEventListener("input", () => $("coordinate").classList.remove("invalid"));
  $("usePosition").addEventListener("click", () => navigator.geolocation?.getCurrentPosition((p) => {
    $("coordinate").value = `${p.coords.latitude.toFixed(5)} ${p.coords.longitude.toFixed(5)}`;
  }, gpsError, { enableHighAccuracy: true }));
  $("stopButton").addEventListener("click", () => {
    if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    audioPlayer.pause(); state.audioQueue.length = 0; state.audioPlaying = false;
    $("navigation").hidden = true;
  });
  window.gpsKarta = { parseCoordinate, navigationData, toSweref99TM, toWgs84, parseMinKartaLink, minKartaUrl, relativeDirection, isPhoneTilted };
})();
