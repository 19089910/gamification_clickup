// Gerencia tickers e hidratação do timer
import { useEffect } from "react";
import { useGraphStore } from "@/store/graphStore";

export function useTimerSync() {
    // Hidratação do timer ao montar
    useEffect(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith("timer_task_")) continue;

            const taskId = key.replace("timer_task_", "");
            const saved = localStorage.getItem(key);
            if (!saved) continue;

            const { startTime, baseMs } = JSON.parse(saved);
            useGraphStore.setState({
                activeTimerTaskId: taskId,
                timerStartTime: startTime,
                additionalMs: Date.now() - startTime,
                timerBaseMs: baseMs ?? 0,
            });
            break;
        }
    }, []);

    // Ticker global
    useEffect(() => {
        const interval = setInterval(() => {
            const state = useGraphStore.getState();
            if (state.activeTimerTaskId) {
                state.tickTimer();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);
}