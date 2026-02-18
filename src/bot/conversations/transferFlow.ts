import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, InlineKeyboard } from 'grammy';
import Logger from '../../utils/logger';

const logger = new Logger('TransferFlow');

type MyContext = Context & ConversationFlavor;
type MyConversation = Conversation<MyContext>;

interface TransferConfig {
  mode: 'all' | 'date_range';
  sourceChannel: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  contentType: ('photo' | 'video')[];
  keyword: string;
}

/**
 * 频道搬运流程会话
 */
export async function transferFlow(conversation: MyConversation, ctx: MyContext) {
  const config: Partial<TransferConfig> = {};

  // 步骤 1: 选择搬运模式
  const modeKeyboard = new InlineKeyboard()
    .text('📚 全频道搬运', 'transfer_mode:all')
    .text('📅 按日期搬运', 'transfer_mode:date_range');

  await ctx.reply(
    '🚀 频道搬运工具\n\n' +
    '请选择搬运模式：',
    { reply_markup: modeKeyboard }
  );

  const modeResponse = await conversation.wait();

  if (!modeResponse.callbackQuery?.data) {
    await ctx.reply('❌ 操作已取消');
    return;
  }

  const mode = modeResponse.callbackQuery.data.split(':')[1] as 'all' | 'date_range';
  config.mode = mode;
  await modeResponse.answerCallbackQuery();

  // 步骤 2: 输入目标频道
  await ctx.reply(
    `${mode === 'all' ? '📚 全频道搬运' : '📅 按日期搬运'}\n\n` +
    '请输入目标频道链接\n' +
    '格式：@channel_name 或 https://t.me/channel_name'
  );

  const channelResponse = await conversation.wait();
  const channelInput = channelResponse.message?.text;

  if (!channelInput) {
    await ctx.reply('❌ 频道链接不能为空，操作已取消');
    return;
  }

  // 解析频道链接
  let channelUsername = channelInput.trim();
  if (channelUsername.startsWith('https://t.me/')) {
    channelUsername = '@' + channelUsername.replace('https://t.me/', '');
  } else if (!channelUsername.startsWith('@')) {
    channelUsername = '@' + channelUsername;
  }

  config.sourceChannel = channelUsername;

  // 步骤 3: 选择日期范围（如果是按日期搬运）
  if (mode === 'date_range') {
    const dateKeyboard = new InlineKeyboard()
      .text('📅 最近1年', 'transfer_date:365')
      .text('📅 最近半年', 'transfer_date:180').row()
      .text('📅 最近3个月', 'transfer_date:90')
      .text('📅 最近30天', 'transfer_date:30').row()
      .text('📅 最近7天', 'transfer_date:7')
      .text('🗓️ 自定义时间', 'transfer_date:custom').row();

    await ctx.reply(
      `✅ 频道：${channelUsername}\n\n` +
      '请选择日期范围：',
      { reply_markup: dateKeyboard }
    );

    const dateResponse = await conversation.wait();

    if (!dateResponse.callbackQuery?.data) {
      await ctx.reply('❌ 操作已取消');
      return;
    }

    const dateChoice = dateResponse.callbackQuery.data.split(':')[1];
    await dateResponse.answerCallbackQuery();

    const endDate = new Date();
    let startDate: Date;

    if (dateChoice === 'custom') {
      // 自定义时间范围
      await ctx.reply(
        '🗓️ 自定义时间范围\n\n' +
        '请输入起始日期（格式：2024-01-01）\n' +
        `截止日期默认为今天（${endDate.toISOString().split('T')[0]}）`
      );

      const customDateResponse = await conversation.wait();
      const dateInput = customDateResponse.message?.text;

      if (!dateInput) {
        await ctx.reply('❌ 日期不能为空，操作已取消');
        return;
      }

      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateInput)) {
        await ctx.reply('❌ 日期格式错误，请使用 YYYY-MM-DD 格式，操作已取消');
        return;
      }

      startDate = new Date(dateInput);

      if (isNaN(startDate.getTime())) {
        await ctx.reply('❌ 无效的日期，操作已取消');
        return;
      }

      if (startDate > endDate) {
        await ctx.reply('❌ 起始日期不能晚于今天，操作已取消');
        return;
      }
    } else {
      // 快捷日期选项
      const days = parseInt(dateChoice);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    config.dateRange = { start: startDate, end: endDate };
  }

  // 步骤 4: 选择内容类型
  const contentKeyboard = new InlineKeyboard()
    .text('🖼️ 仅图片', 'transfer_content:photo')
    .text('🎥 仅视频', 'transfer_content:video')
    .text('🎬 图片+视频', 'transfer_content:both');

  const dateRangeText = config.dateRange
    ? `📅 日期范围：${config.dateRange.start.toISOString().split('T')[0]} ~ ${config.dateRange.end.toISOString().split('T')[0]}\n\n`
    : '';

  await ctx.reply(
    `✅ 频道：${channelUsername}\n` +
    dateRangeText +
    '请选择内容类型：',
    { reply_markup: contentKeyboard }
  );

  const contentResponse = await conversation.wait();

  if (!contentResponse.callbackQuery?.data) {
    await ctx.reply('❌ 操作已取消');
    return;
  }

  const contentChoice = contentResponse.callbackQuery.data.split(':')[1];
  await contentResponse.answerCallbackQuery();

  if (contentChoice === 'photo') {
    config.contentType = ['photo'];
  } else if (contentChoice === 'video') {
    config.contentType = ['video'];
  } else {
    config.contentType = ['photo', 'video'];
  }

  const contentTypeText = contentChoice === 'photo' ? '仅图片' :
                          contentChoice === 'video' ? '仅视频' : '图片+视频';

  // 步骤 5: 输入关键字（强制）
  await ctx.reply(
    `🎬 内容类型：${contentTypeText}\n\n` +
    '请输入关键字（支持模糊匹配）\n' +
    '合集标题将使用此关键字'
  );

  const keywordResponse = await conversation.wait();
  const keyword = keywordResponse.message?.text?.trim();

  if (!keyword) {
    await ctx.reply('❌ 关键字不能为空，操作已取消');
    return;
  }

  config.keyword = keyword;

  // 步骤 6: 确认配置
  const confirmKeyboard = new InlineKeyboard()
    .text('🚀 开始搬运', 'transfer_confirm:start')
    .text('❌ 取消', 'transfer_confirm:cancel');

  const modeText = config.mode === 'all' ? '全频道搬运' : '按日期搬运';
  const dateText = config.dateRange
    ? `📅 日期范围：${config.dateRange.start.toISOString().split('T')[0]} ~ ${config.dateRange.end.toISOString().split('T')[0]}\n`
    : '';

  await ctx.reply(
    '✅ 搬运任务配置完成\n\n' +
    `📦 合集标题：${keyword}\n` +
    `📺 目标频道：${channelUsername}\n` +
    `📋 搬运模式：${modeText}\n` +
    dateText +
    `🎬 内容类型：${contentTypeText}\n` +
    `🔍 关键字：${keyword}\n\n` +
    '确认开始搬运？',
    { reply_markup: confirmKeyboard }
  );

  const confirmResponse = await conversation.wait();

  if (!confirmResponse.callbackQuery?.data) {
    await ctx.reply('❌ 操作已取消');
    return;
  }

  const confirmChoice = confirmResponse.callbackQuery.data.split(':')[1];
  await confirmResponse.answerCallbackQuery();

  if (confirmChoice === 'cancel') {
    await ctx.reply('❌ 操作已取消');
    return;
  }

  // 步骤 7: 开始搬运
  // 给管理员发送开始提示
  await ctx.reply(
    '🚀 搬运任务已启动\n\n' +
    '⏳ UserBot 正在处理...\n' +
    '完成后会通知您'
  );

  logger.info('Starting UserBot transfer with config');

  // 异步调用 UserBot 开始搬运，直接传入配置参数
  const { startTransfer } = require('../../userbot/transfer');
  startTransfer(ctx, {
    mode: config.mode,
    sourceChannel: config.sourceChannel,
    dateRange: config.dateRange,
    contentType: config.contentType,
    keyword: config.keyword,
    userId: ctx.from!.id,
  } as TransferConfig).catch((error: any) => {
    logger.error('Transfer task failed', error);
    ctx.reply('❌ 搬运任务执行失败').catch(() => {});
  });

  // transferFlow 会话结束，管理员可以继续使用其他功能
}
