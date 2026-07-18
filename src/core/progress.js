let warmupStatus = {
    isRunning: false,
    activeWarmups: 0,
    stats: {
        totalMessages: 0,
        totalPhotos: 0,
        totalConversations: 0,
        averageTrust: 0
    }
};

let warmupInterval = null;

export async function startWarmup(hours, intensity = 'medium') {
    if (warmupStatus.isRunning) {
        throw new Error('Прогрев уже запущен');
    }

    warmupStatus.isRunning = true;
    warmupStatus.activeWarmups = 1;

    const intervalMs = intensity === 'high' ? 30000 : intensity === 'medium' ? 60000 : 120000;
    const totalMs = hours * 60 * 60 * 1000;
    let elapsedMs = 0;

    return new Promise((resolve) => {
        warmupInterval = setInterval(() => {
            elapsedMs += intervalMs;
            warmupStatus.stats.totalMessages += Math.floor(Math.random() * 5) + 1;
            warmupStatus.stats.totalConversations += 1;
            warmupStatus.stats.averageTrust = Math.min(100, warmupStatus.stats.averageTrust + 0.5 + Math.random());

            if (elapsedMs >= totalMs) {
                clearInterval(warmupInterval);
                warmupStatus.isRunning = false;
                warmupStatus.activeWarmups = 0;
                resolve({
                    duration: hours,
                    iterations: Math.floor(elapsedMs / intervalMs),
                    totalMessages: warmupStatus.stats.totalMessages,
                    totalPhotos: warmupStatus.stats.totalPhotos
                });
            }
        }, intervalMs);
    });
}

export function stopWarmup() {
    if (warmupInterval) {
        clearInterval(warmupInterval);
        warmupInterval = null;
    }
    warmupStatus.isRunning = false;
    warmupStatus.activeWarmups = 0;
    return { success: true };
}

export function getWarmupStatus() {
    return warmupStatus;
}