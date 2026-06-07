import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  VoiceConnection,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { Readable } from 'stream';
import { promisify } from 'node:util';
import { Collection } from '@discordjs/collection';
import { TTSTrack } from '../types/types.js';

const wait = promisify(setTimeout);

export class TTS {
  public readonly voiceConnection: VoiceConnection;
  public readonly audioPlayer: AudioPlayer;
  public queue: TTSTrack[] = [];
  public currentTrack: TTSTrack | null = null;
  public queueLock = false;
  public readyLock = false;
  public timeout: NodeJS.Timeout | null = null;

  public constructor(voiceConnection: VoiceConnection) {
    this.voiceConnection = voiceConnection;
    this.audioPlayer = createAudioPlayer();

    this.voiceConnection.on('stateChange', async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          try {
            await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
          } catch {
            this.voiceConnection.destroy();
          }
        } else if (this.voiceConnection.rejoinAttempts < 5) {
          await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
          this.voiceConnection.rejoin();
        } else {
          this.voiceConnection.destroy();
        }
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        this.stop();
      } else if (
        !this.readyLock &&
        (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
      ) {
        this.readyLock = true;
        try {
          await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
        } catch {
          if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.voiceConnection.destroy();
          }
        } finally {
          this.readyLock = false;
        }
      }
    });

    this.audioPlayer.on('stateChange', (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        this.currentTrack?.onFinish?.();
        this.currentTrack = null;
        void this.processQueue();
      }
    });

    this.audioPlayer.on('error', (error) => {
      const track = this.queue[0];
      track?.onError?.(error);
    });

    voiceConnection.subscribe(this.audioPlayer);
  }

  public enqueue(track: TTSTrack) {
    this.queue.push(track);
    void this.processQueue();
  }

  public stop() {
    this.queueLock = true;
    this.queue = [];
    this.audioPlayer.stop(true);
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
      return;
    }

    this.queueLock = true;
    const nextTrack = this.queue.shift()!;

    try {
      this.currentTrack = nextTrack;
      const resource = createAudioResource(Readable.from(nextTrack.buffer), {
        inputType: StreamType.OggOpus,
      });
      this.audioPlayer.play(resource);
      this.queueLock = false;
    } catch (error) {
      nextTrack.onError?.(error as Error);
      this.queueLock = false;
      return this.processQueue();
    }
  }
}

const subscriptions = new Collection<string, TTS>();

export function getSubscription(guildId: string): TTS | undefined {
  return subscriptions.get(guildId);
}

export function subscribe(guildId: string, subscription: TTS): void {
  subscriptions.set(guildId, subscription);
}

export function unsubscribe(guildId: string): void {
  subscriptions.delete(guildId);
}
