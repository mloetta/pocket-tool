import cron from 'node-cron';
import { supabase } from '../utils/supabase.js';
import { Collection } from '@discordjs/collection';
import { Reminder } from '../types/types.js';
import { Client, ComponentType, MessageFlags } from '@discordjs/core';
import { emoji } from '../utils/markdown.js';

export const LOOKAHEAD_MS = 5 * 60 * 1000;
const scheduled = new Collection<string, NodeJS.Timeout>();

async function remind(reminder: Reminder, client: Client): Promise<void> {
  await client.api.users
    .createDM(reminder.user_id)
    .then((dm) =>
      client.api.channels.createMessage(dm.id, {
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

export function scheduleReminder(reminder: Reminder, client: Client): void {
  if (scheduled.has(reminder.id)) {
    return;
  }

  const ms = new Date(reminder.time).getTime() - new Date().getTime();

  if (ms <= 0) {
    remind(reminder, client);
    return;
  }

  const timeout = setTimeout(() => {
    remind(reminder, client);
    scheduled.delete(reminder.id);
  }, ms);

  scheduled.set(reminder.id, timeout);
}

async function loadReminders(client: Client): Promise<void> {
  const now = new Date();
  const soon = new Date(new Date().getTime() + LOOKAHEAD_MS);

  const { data, error } = await supabase
    .from('reminder')
    .select('*')
    .gte('time', now.toISOString())
    .lte('time', soon.toISOString());

  if (error || !data) return;

  for (const reminder of data) {
    scheduleReminder(reminder, client);
  }
}

export function startReminderCron(client: Client): void {
  loadReminders(client);
  cron.schedule('* * * * *', () => loadReminders(client));
  console.log('Reminder cron started');
}
