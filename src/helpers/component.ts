import { client } from '../bot/index.js';
import type { Component } from '../types/types.js';

export default function createComponent<Args extends readonly string[] = readonly string[]>(
  component: Component<Args>,
): void {
  client.components.set(component.custom_id, component);
}
