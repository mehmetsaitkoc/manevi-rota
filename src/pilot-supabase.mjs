export function pilotEventToSupabaseRow(event={}){
  const p=event?.payload||{};
  const row={
    event_id:String(event.eventId||''),
    pilot_id:String(event.pilotId||''),
    schema_version:Number(event.schemaVersion||1),
    event_type:String(event.type||''),
    occurred_at:String(event.occurredAt||new Date().toISOString()),
    app_version:String(event.appVersion||'unknown')
  };
  if(event.type==='route_created'){
    Object.assign(row,{
      mode:p.mode??null,
      planned_count:p.plannedCount??null,
      total_minutes:p.totalMinutes??null,
      budget:p.budget??null,
      light_day:Boolean(p.lightDay),
      evidence_days:p.evidenceDays??null,
      effective_evidence_days:p.effectiveEvidenceDays??null,
      evidence_freshness:p.evidenceFreshness??null,
      confidence:p.confidence??null,
      prior_weight:p.priorWeight??null,
      overload_risk:p.overloadRisk??null,
      recent_completion:p.recentCompletion??null,
      learned_sustainable_minutes:p.learnedSustainableMinutes??null,
      capacity_phase:p.capacityPhase??null,
      behavior_shift:p.behaviorShift??null,
      checkin_minutes:p.checkinMinutes??null,
      energy:p.energy??null,
      load:p.load??null,
      mood:p.mood??null,
      day_context:p.context??null
    });
  }else if(event.type==='day_progress'){
    Object.assign(row,{
      mode:p.mode??null,
      planned_count:p.plannedCount??null,
      completed_count:p.completedCount??null,
      completion_pct:p.completionPct??null,
      total_minutes:p.totalMinutes??null,
      light_day:Boolean(p.lightDay),
      action:p.action??null,
      day_feedback:p.dayFeedback??null,
      task_feedback_hard:p.taskFeedbackCounts?.hard??0,
      task_feedback_normal:p.taskFeedbackCounts?.normal??0,
      task_feedback_easy:p.taskFeedbackCounts?.easy??0
    });
  }
  return row;
}

export function pilotEventsToSupabaseRows(events=[]){
  return Array.isArray(events)?events.map(pilotEventToSupabaseRow):[];
}
