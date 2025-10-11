/* ============================================
   Focus Bubbles - Rust Core (Neon/Node.js)
   ============================================ */

use neon::prelude::*;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum Phase {
    Work,
    ShortBreak,
    LongBreak,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
pub enum RunState {
    Idle,
    Running,
    Paused,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PomodoroPlan {
    pub work_min: u16,
    pub short_break_min: u16,
    pub long_break_min: u16,
    pub cycle_len: u8,
    pub auto_start: bool,
}

impl PomodoroPlan {
    pub fn default_plan() -> Self {
        Self {
            work_min: 25,
            short_break_min: 5,
            long_break_min: 15,
            cycle_len: 4,
            auto_start: true,
        }
    }
}

impl Default for PomodoroPlan {
    fn default() -> Self {
        Self::default_plan()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub session_id: String,
    pub phase: Phase,
    pub run_state: RunState,
    pub millis_total: u64,
    pub millis_elapsed: u64,
    pub cycle_index: u8,
}

#[derive(Clone, Debug)]
struct Session {
    id: Uuid,
    plan: PomodoroPlan,
    phase: Phase,
    run_state: RunState,
    started_at: Instant,
    carried_ms: u64,
    cycle_index: u8,
}

fn phase_ms(plan: &PomodoroPlan, phase: Phase) -> u64 {
    match phase {
        Phase::Work => plan.work_min as u64 * 60_000,
        Phase::ShortBreak => plan.short_break_min as u64 * 60_000,
        Phase::LongBreak => plan.long_break_min as u64 * 60_000,
    }
}

impl Session {
    fn elapsed_ms(&self) -> u64 {
        match self.run_state {
            RunState::Running => {
                self.carried_ms + self.started_at.elapsed().as_millis() as u64
            }
            _ => self.carried_ms,
        }
    }

    fn total_ms(&self) -> u64 {
        phase_ms(&self.plan, self.phase)
    }

    fn is_phase_complete(&self) -> bool {
        self.elapsed_ms() >= self.total_ms()
    }

    fn maybe_auto_advance(&mut self) {
        if self.is_phase_complete() && self.plan.auto_start && self.run_state == RunState::Running
        {
            match self.phase {
                Phase::Work => {
                    let (next_phase, _) = next_phase(&self.plan, self.cycle_index);
                    self.phase = next_phase;
                    self.started_at = Instant::now();
                    self.carried_ms = 0;
                }
                Phase::ShortBreak | Phase::LongBreak => {
                    let (next_phase, next_idx) = after_break(&self.plan, self.cycle_index);
                    self.phase = next_phase;
                    self.cycle_index = next_idx;
                    self.started_at = Instant::now();
                    self.carried_ms = 0;
                }
            }
        }
    }
}

static ENGINE: Lazy<Mutex<Option<Session>>> = Lazy::new(|| Mutex::new(None));

fn next_phase(plan: &PomodoroPlan, last_cycle_index: u8) -> (Phase, u8) {
    if last_cycle_index >= plan.cycle_len {
        (Phase::LongBreak, plan.cycle_len)
    } else {
        (Phase::ShortBreak, last_cycle_index)
    }
}

fn after_break(plan: &PomodoroPlan, last_cycle_index: u8) -> (Phase, u8) {
    let next = if last_cycle_index >= plan.cycle_len {
        1
    } else {
        last_cycle_index + 1
    };
    (Phase::Work, next)
}

/* ============================================
   Neon/Node.js API Functions
   ============================================ */

fn start_work(mut cx: FunctionContext) -> JsResult<JsString> {
    let plan = PomodoroPlan::default_plan(); // TODO: Accept plan from JS
    
    let mut guard = ENGINE.lock();
    let (cycle_index, plan_to_use) = match &*guard {
        Some(s) => (
            if matches!(s.phase, Phase::Work) {
                s.cycle_index
            } else {
                s.cycle_index
            },
            s.plan.clone(),
        ),
        None => (1_u8, plan.clone()),
    };
    let s = Session {
        id: Uuid::new_v4(),
        plan: if guard.is_some() { plan_to_use } else { plan },
        phase: Phase::Work,
        run_state: RunState::Running,
        started_at: Instant::now(),
        carried_ms: 0,
        cycle_index,
    };
    *guard = Some(s);
    
    let snapshot = get_snapshot();
    let json = serde_json::to_string(&snapshot).unwrap();
    Ok(cx.string(json))
}

fn pause_timer(mut cx: FunctionContext) -> JsResult<JsString> {
    let mut g = ENGINE.lock();
    if let Some(s) = g.as_mut() {
        if s.run_state == RunState::Running {
            s.carried_ms = s.elapsed_ms();
            s.run_state = RunState::Paused;
        }
    }
    
    let snapshot = get_snapshot();
    let json = serde_json::to_string(&snapshot).unwrap();
    Ok(cx.string(json))
}

fn resume_timer(mut cx: FunctionContext) -> JsResult<JsString> {
    let mut g = ENGINE.lock();
    if let Some(s) = g.as_mut() {
        if s.run_state == RunState::Paused {
            s.started_at = Instant::now();
            s.run_state = RunState::Running;
        }
    }
    
    let snapshot = get_snapshot();
    let json = serde_json::to_string(&snapshot).unwrap();
    Ok(cx.string(json))
}

fn stop_timer(mut cx: FunctionContext) -> JsResult<JsString> {
    let mut g = ENGINE.lock();
    *g = None;
    
    let snapshot = SessionSnapshot {
        session_id: String::new(),
        phase: Phase::Work,
        run_state: RunState::Idle,
        millis_total: 0,
        millis_elapsed: 0,
        cycle_index: 0,
    };
    let json = serde_json::to_string(&snapshot).unwrap();
    Ok(cx.string(json))
}

fn get_snapshot_js(mut cx: FunctionContext) -> JsResult<JsString> {
    let snapshot = get_snapshot();
    let json = serde_json::to_string(&snapshot).unwrap();
    Ok(cx.string(json))
}

fn get_snapshot() -> SessionSnapshot {
    let mut g = ENGINE.lock();
    if let Some(s) = g.as_mut() {
        s.maybe_auto_advance();
        
        SessionSnapshot {
            session_id: s.id.to_string(),
            phase: s.phase,
            run_state: s.run_state,
            millis_total: s.total_ms(),
            millis_elapsed: s.elapsed_ms().min(s.total_ms()),
            cycle_index: s.cycle_index,
        }
    } else {
        SessionSnapshot {
            session_id: String::new(),
            phase: Phase::Work,
            run_state: RunState::Idle,
            millis_total: 0,
            millis_elapsed: 0,
            cycle_index: 0,
        }
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("startWork", start_work)?;
    cx.export_function("pauseTimer", pause_timer)?;
    cx.export_function("resumeTimer", resume_timer)?;
    cx.export_function("stopTimer", stop_timer)?;
    cx.export_function("getSnapshot", get_snapshot_js)?;
    Ok(())
}

