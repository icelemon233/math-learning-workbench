import { useState } from 'react';
import { Alert, Button, DatePicker, Empty, Grid, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { Dayjs } from 'dayjs';
import { displayDate } from './lib';
import { ARCHIVED_LESSON_MESSAGE } from './lesson-policy';
import type { AppData, Lesson } from './types';

export type LessonActions = { add: () => void; open: (lesson: Lesson) => void; edit: (lesson: Lesson) => void; remove: (lesson: Lesson) => void; busy: boolean };

// Both entry points use the same records and actions. The profile supplies a
// fixed student ID and remounts this list when the selected student changes.
export function LessonRecords({ data, studentId, add, open, edit, remove, busy }: LessonActions & { data: AppData; studentId?: string }) {
  const screens = Grid.useBreakpoint();
  const [student, setStudent] = useState<string>();
  const [month, setMonth] = useState<Dayjs | null>(null);
  const [search, setSearch] = useState('');
  const scope = studentId ?? student;
  const selected = data.students.find(item => item.id === scope);
  const monthString = month?.format('YYYY-MM');
  const rows = data.lessons.filter(lesson => (!scope || lesson.student_id === scope) && (!monthString || lesson.lesson_date.startsWith(monthString)) && `${lesson.content}${lesson.problems}`.includes(search.trim()));
  const filtered = Boolean(student || month || search);
  const canAdd = studentId ? !!selected && !selected.archived : data.students.some(item => !item.archived);
  const studentLabel = (lesson: Lesson) => {
    const owner = data.students.find(item => item.id === lesson.student_id);
    return <Space wrap size={4}>{owner?.name ?? '学生记录'}{owner?.archived && <Tag>已归档</Tag>}</Space>;
  };
  const feedbackStatus = (lesson: Lesson) => <Tag color={lesson.feedback ? 'success' : 'default'}>{lesson.feedback ? '已有反馈' : '待整理'}</Tag>;
  const actions = (lesson: Lesson) => {
    const archived = data.students.find(item => item.id === lesson.student_id)?.archived;
    return <Space wrap size={0}>
      <Tooltip title={archived ? ARCHIVED_LESSON_MESSAGE : undefined}><Button type="link" size="small" icon={<EditOutlined />} disabled={busy} onClick={() => edit(lesson)}>编辑</Button></Tooltip>
      <Button type="link" size="small" disabled={busy} onClick={() => open(lesson)}>{archived ? '查看反馈' : '查看 / 整理反馈'}</Button>
      <Button type="link" danger size="small" icon={<DeleteOutlined />} disabled={busy} onClick={() => remove(lesson)}>删除</Button>
    </Space>;
  };
  const columns: TableColumnsType<Lesson> = screens.md ? [
    { title: '课堂日期', dataIndex: 'lesson_date', width: 120, render: displayDate, sorter: (a, b) => a.lesson_date.localeCompare(b.lesson_date) || a.created_at.localeCompare(b.created_at), defaultSortOrder: 'descend' },
    ...(!studentId ? [{ title: '学生', width: 150, render: (_: unknown, lesson: Lesson) => studentLabel(lesson) }] : []),
    { title: '课堂内容', dataIndex: 'content', width: 260, render: value => <Typography.Paragraph ellipsis={{ rows: 3, tooltip: value }} style={{ margin: 0 }}>{value}</Typography.Paragraph> },
    { title: '课堂问题', dataIndex: 'problems', width: 220, render: value => <Typography.Paragraph ellipsis={{ rows: 3, tooltip: value }} style={{ margin: 0 }}>{value || '—'}</Typography.Paragraph> },
    { title: '课后反馈', width: 112, render: (_, lesson) => feedbackStatus(lesson) },
    { title: '操作', width: 260, fixed: 'right', render: (_, lesson) => actions(lesson) },
  ] : [{
    title: '课堂记录', dataIndex: 'lesson_date', sorter: (a, b) => a.lesson_date.localeCompare(b.lesson_date) || a.created_at.localeCompare(b.created_at), defaultSortOrder: 'descend',
    render: (_, lesson) => <Space orientation="vertical" size={8} className="full-width">
      <Space wrap size={8}><Typography.Text strong>{displayDate(lesson.lesson_date)}</Typography.Text>{!studentId && studentLabel(lesson)}{feedbackStatus(lesson)}</Space>
      <Typography.Paragraph className="prewrap" ellipsis={{ rows: 3 }} style={{ margin: 0 }}>{lesson.content}</Typography.Paragraph>
      {lesson.problems && <Typography.Paragraph type="secondary" className="prewrap" ellipsis={{ rows: 2 }} style={{ margin: 0 }}>课堂问题：{lesson.problems}</Typography.Paragraph>}
      {actions(lesson)}
    </Space>,
  }];
  return <div className="lesson-records">
    {selected?.archived && <Alert type="info" showIcon title={ARCHIVED_LESSON_MESSAGE} description="历史课堂和反馈可查看、复制；删除仍需确认。" style={{ marginBottom: 16 }} />}
    <div className="filter-bar">
      {!studentId && <Select aria-label="按学生筛选课堂" placeholder="全部学生" showSearch optionFilterProp="label" allowClear value={student} onChange={setStudent} options={data.students.map(item => ({ value: item.id, label: `${item.name}${item.archived ? '（已归档）' : ''}` }))} style={{ width: 180 }} />}
      <DatePicker picker="month" aria-label="按月份筛选课堂" placeholder="全部月份" value={month} onChange={setMonth} style={{ width: 160 }} />
      <Input prefix={<SearchOutlined />} aria-label="搜索课堂内容" placeholder="搜索内容或问题" value={search} allowClear onChange={event => setSearch(event.target.value)} style={{ width: 260, maxWidth: '100%' }} />
      {filtered && <Button onClick={() => { setStudent(undefined); setMonth(null); setSearch(''); }}>清除筛选</Button>}
      {studentId && <Typography.Text type="secondary">{rows.length} 次课堂</Typography.Text>}
    </div>
    <Table<Lesson> key={`${scope ?? ''}:${monthString ?? ''}:${search}`} rowKey="id" columns={columns} dataSource={rows} size="small"
      pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: total => `共 ${total} 条` }} scroll={screens.md ? { x: studentId ? 970 : 1120 } : undefined}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtered ? '没有匹配的课堂记录，请调整筛选条件。' : '还没有课堂记录。'}>
        {!filtered && canAdd && <Button type="primary" disabled={busy} onClick={add}>记录课堂</Button>}
      </Empty> }} />
  </div>;
}
