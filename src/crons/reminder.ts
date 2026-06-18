import cron from 'node-cron';
import { supabase } from '../utils/supabase.js';
import { Collection } from '@discordjs/collection';
import { API, ComponentType, MessageFlags } from '@discordjs/core';
import { emoji } from '../utils/markdown.js';
import type { Reminder } from '../types/types.js';

export const LOOKAHEAD_MS = 5 * 60 * 1000;
const scheduled = new Collection<string, NodeJS.Timeout>();

async function remind(reminder: Reminder, api: API): Promise<void> {
  await api.users
    .createDM(reminder.user_id)
    .then((dm) =>
      api.channels.createMessage(dm.id, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `> ${emoji('clock')} ${reminder.reason}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      }),
    )
    .catch(() => null)
    .finally(async () => await supabase.from('reminder').delete().eq('id', reminder.id));
}

export function scheduleReminder(reminder: Reminder, api: API): void {
  if (scheduled.has(reminder.id)) {
    return;
  }

  const ms = new Date(reminder.time).getTime() - new Date().getTime();

  if (ms <= 0) {
    remind(reminder, api);
    return;
  }

  const timeout = setTimeout(() => {
    remind(reminder, api);
    scheduled.delete(reminder.id);
  }, ms);

  scheduled.set(reminder.id, timeout);
}

async function loadReminders(api: API): Promise<void> {
  const now = new Date();
  const soon = new Date(new Date().getTime() + LOOKAHEAD_MS);

  const { data, error } = await supabase
    .from('reminder')
    .select('*')
    .gte('time', now.toISOString())
    .lte('time', soon.toISOString());

  if (error || !data) return;

  for (const reminder of data) {
    scheduleReminder(reminder, api);
  }
}

export function startReminderCron(api: API): void {
  loadReminders(api);
  cron.schedule('* * * * *', () => loadReminders(api));
  console.log('Reminder cron started');
}
