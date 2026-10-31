import { useState } from 'react';
import { Alert, Button, Card, Collapse, Descriptions, Form, Input, Popconfirm, Tooltip, Typography } from 'antd';
import { BulbOutlined, CopyOutlined } from '@ant-design/icons';
import { invokeAI, saveFeedback } from './api';
import { displayDate } from './lib';
import { ARCHIVED_LESSON_MESSAGE } from './lesson-policy';
import type { Lesson } from './types';

type Props = {
  lesson: Lesson;
  studentName: string;
  readOnly: boolean;
  busy: boolean;
  run: (action: () => Promise<unknown>, message?: string, refresh?: boolean) => Promise<boolean>;
};

export function FeedbackEditor({ lesson, studentName, readOnly, busy, run }: Props) {
  const [feedback, setFeedback] = useState(lesson.feedback);
  const [baseline, setBaseline] = useState(lesson);
  const unsavedText = !!feedback.trim() && feedback !== baseline.feedback;
  const generate = () => run(async () => {
    if (readOnly) throw new Error(ARCHIVED_LESSON_MESSAGE);
    // Always use saved lesson facts. The editor is only for manual review.
    const result = await invokeAI({ action: 'lesson_feedback', lesson_id: lesson.id });
    if (typeof result?.feedback !== 'string' || !result.feedback.trim()) throw new Error('没有收到反馈内容');
    setFeedback(result.feedback); setBaseline(lesson);
  }, '反馈已整理，请核对后保存', false);
  const fields = [
    ['content', '本节课内容'], ['performance', '课堂表现'], ['problems', '暴露问题'],
    ['homework_completion', '上次作业完成情况'], ['homework', '本次课后作业'], ['next_plan', '下节课计划'],
  ] as const;

  return <div className="page-stack">
    {readOnly && <Alert type="info" showIcon title={ARCHIVED_LESSON_MESSAGE} description="本次可查看原始课堂记录、选择文字或复制历史反馈。" />}
    <Card size="small" className="feedback-summary">
      <Descriptions size="small" column={2} items={[
        { key: 'student', label: '学生', children: studentName },
        { key: 'date', label: '日期', children: displayDate(lesson.lesson_date) },
      ]} />
      <Collapse ghost size="small" items={[{
        key: 'source', label: '查看本节课原始记录',
        children: <Descriptions size="small" column={1} items={fields.map(([key, label]) => ({
          key, label, children: <span className="prewrap">{lesson[key] || '未填写'}</span>,
        }))} />,
      }]} />
    </Card>
    <div className="feedback-toolbar">
      <Typography.Text type="secondary">{readOnly ? '历史反馈仅供查看和复制。' : '按已保存的课堂记录分点整理，生成后可手动修改。'}</Typography.Text>
      <Popconfirm title="重新整理会替换当前反馈" description="当前反馈尚未保存。需要保留时，请先保存或复制。"
        okText="重新整理" cancelText="取消" disabled={!unsavedText || busy || readOnly} onConfirm={() => { void generate(); }}>
        <Button icon={<BulbOutlined />} loading={busy} disabled={readOnly} onClick={() => { if (!unsavedText && !readOnly) void generate(); }}>AI 整理反馈</Button>
      </Popconfirm>
    </div>
    <Form layout="vertical"><Form.Item label="课后反馈" style={{ marginBottom: 0 }}>
      <Input.TextArea aria-label="课后反馈" value={feedback} onChange={event => setFeedback(event.target.value)}
        rows={16} maxLength={12000} disabled={busy} readOnly={readOnly} placeholder={readOnly ? '本节课尚未保存反馈。' : '点击“AI 整理反馈”生成，核对后可在此修改，再保存或复制。'} />
    </Form.Item></Form>
    <div className="form-footer">
      <Button icon={<CopyOutlined />} disabled={!feedback.trim() || busy} onClick={() => { void run(() => navigator.clipboard.writeText(feedback), '反馈已复制', false); }}>复制文字</Button>
      <Tooltip title={readOnly ? ARCHIVED_LESSON_MESSAGE : undefined}><Button type="primary" loading={busy} disabled={!feedback.trim() || readOnly} onClick={() => { void run(async () => {
        if (readOnly) throw new Error(ARCHIVED_LESSON_MESSAGE);
        const saved = await saveFeedback(baseline, feedback.trim()); setBaseline(saved);
      }, '课后反馈已保存'); }}>保存反馈</Button></Tooltip>
    </div>
  </div>;
}
