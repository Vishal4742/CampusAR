use crate::sensors::motion::{MOTION_STATE_ACTIVE, MOTION_STATE_IDLE, MOTION_STATE_WALKING};

const ACTIVE_NAVIGATION_MOVING_INTERVAL_NANOS: i64 = 20_000_000;
const ACTIVE_NAVIGATION_IDLE_INTERVAL_NANOS: i64 = 100_000_000;
const SCREEN_ON_BACKGROUND_INTERVAL_NANOS: i64 = 200_000_000;
const SCREEN_OFF_INTERVAL_NANOS: i64 = 1_000_000_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SamplingController {
    pub motion_state: i32,
    pub screen_on: bool,
    pub navigation_active: bool,
    pub last_update_nanos: i64,
}

impl SamplingController {
    pub fn new() -> Self {
        Self {
            motion_state: 0,
            screen_on: true,
            navigation_active: false,
            last_update_nanos: i64::MIN,
        }
    }

    pub fn recommended_interval_nanos(&self) -> i64 {
        if !self.screen_on {
            return SCREEN_OFF_INTERVAL_NANOS;
        }

        if self.navigation_active {
            return match self.motion_state {
                MOTION_STATE_WALKING | MOTION_STATE_ACTIVE => {
                    ACTIVE_NAVIGATION_MOVING_INTERVAL_NANOS
                }
                MOTION_STATE_IDLE => ACTIVE_NAVIGATION_IDLE_INTERVAL_NANOS,
                _ => ACTIVE_NAVIGATION_IDLE_INTERVAL_NANOS,
            };
        }

        SCREEN_ON_BACKGROUND_INTERVAL_NANOS
    }

    pub fn should_sample(&mut self, current_nanos: i64) -> bool {
        if self.last_update_nanos == i64::MIN || current_nanos < self.last_update_nanos {
            self.last_update_nanos = current_nanos;
            return true;
        }

        let interval = self.recommended_interval_nanos();
        if current_nanos.saturating_sub(self.last_update_nanos) >= interval {
            self.last_update_nanos = current_nanos;
            true
        } else {
            false
        }
    }

    pub fn update_motion_state(&mut self, state: i32) {
        self.motion_state = state;
    }

    pub fn set_screen_on(&mut self, on: bool) {
        self.screen_on = on;
    }

    pub fn set_navigation_active(&mut self, active: bool) {
        self.navigation_active = active;
    }
}

impl Default for SamplingController {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_navigation_walking_uses_50_hz() {
        let mut controller = SamplingController::new();
        controller.set_navigation_active(true);
        controller.update_motion_state(MOTION_STATE_WALKING);

        assert_eq!(
            controller.recommended_interval_nanos(),
            ACTIVE_NAVIGATION_MOVING_INTERVAL_NANOS
        );
    }

    #[test]
    fn active_navigation_idle_uses_10_hz() {
        let mut controller = SamplingController::new();
        controller.set_navigation_active(true);
        controller.update_motion_state(MOTION_STATE_IDLE);

        assert_eq!(
            controller.recommended_interval_nanos(),
            ACTIVE_NAVIGATION_IDLE_INTERVAL_NANOS
        );
    }

    #[test]
    fn screen_on_without_navigation_uses_5_hz() {
        let controller = SamplingController::new();

        assert_eq!(
            controller.recommended_interval_nanos(),
            SCREEN_ON_BACKGROUND_INTERVAL_NANOS
        );
    }

    #[test]
    fn screen_off_uses_1_hz() {
        let mut controller = SamplingController::new();
        controller.set_screen_on(false);
        controller.set_navigation_active(true);
        controller.update_motion_state(MOTION_STATE_ACTIVE);

        assert_eq!(
            controller.recommended_interval_nanos(),
            SCREEN_OFF_INTERVAL_NANOS
        );
    }

    #[test]
    fn should_sample_updates_last_time_only_when_interval_elapsed() {
        let mut controller = SamplingController::new();
        controller.set_navigation_active(true);
        controller.update_motion_state(MOTION_STATE_WALKING);

        assert!(controller.should_sample(0));
        assert!(!controller.should_sample(10_000_000));
        assert!(controller.should_sample(20_000_000));
        assert_eq!(controller.last_update_nanos, 20_000_000);
    }

    #[test]
    fn clock_reversal_samples_and_resets_timestamp() {
        let mut controller = SamplingController::new();
        assert!(controller.should_sample(100));
        assert!(controller.should_sample(50));
        assert_eq!(controller.last_update_nanos, 50);
    }
}
