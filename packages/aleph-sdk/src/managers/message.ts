import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { GetMessagesConfiguration, MessageType } from '@aleph-sdk/message'
import { DEFAULT_API_SERVER, defaultConsoleChannel } from '@/constants'
import Err from '@/errors'

type AnyMessage = {
  item_hash: string
  channel: string
}

export class MessageManager {
  constructor(
    protected account?: Account,
    protected sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient = !account
      ? new AlephHttpClient(DEFAULT_API_SERVER)
      : new AuthenticatedAlephHttpClient(account, DEFAULT_API_SERVER),
    protected channel = defaultConsoleChannel,
  ) {}

  async get<T extends MessageType>(hash: string) {
    try {
      const msg = await this.sdkClient.getMessage<T>(hash)
      return msg
    } catch (error) {
      throw Err.RequestFailed(error)
    }
  }

  async getAll(config: GetMessagesConfiguration) {
    try {
      const msgs = await this.sdkClient.getMessages(config)
      return msgs
    } catch (error) {
      throw Err.RequestFailed(error)
    }
  }

  async del(message: AnyMessage) {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      const msg = await this.sdkClient.forget({
        hashes: [message.item_hash],
        channel: message.channel,
      })

      return msg
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }
}
