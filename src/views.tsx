import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AimOutlined, ArrowRightOutlined, CalendarOutlined, EditOutlined, FileTextOutlined,
  PlusOutlined, SearchOutlined, TeamOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Avatar, Button, Card, Checkbox, Col, Descriptions, Empty, Flex, Input,
  Pagination, Popconfirm, Progress, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { displayDate, masteryCounts, monthPeriod, today } from './lib';
import { STATUS_OPTIONS } from './types';
import { LessonRecords } from './lesson-records';
import type { LessonActions } from './lesson-records';
import type { AppData, KnowledgePoint, Lesson, MasteryStatus, MonthlyReport, Student, StudentKnowledge } from './types';

const { Title, Text, Paragraph } = Typography;
const statusColors: Record<MasteryStatus, string> = { pending: 'default', weak: 'error', basic: 'gold', mastered: 'success' };
const progressColors: Record<MasteryStatus, string> = { pending: '#bfbfbf', weak: '#ff4d4f', basic: '#faad14', mastered: '#52c41a' };
const pagination = { defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total: number) => `共 ${total} 条` };

function ViewHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><Space orientation="vertical" size={4}>
    <Title level={2} style={{ margin: 0 }}>{title}</Title><Text type="secondary">{description}</Text>
  </Space>{action}</div>;
}
function MasteryTag({ status }: { status: MasteryStatus }) {
  return <Tag color={statusColors[status]}>{STATUS_OPTIONS.find(item => item.value === status)?.label}</Tag>;
}
function studentOptions(students: Student[]) {
  return students.map(student => ({ value: student.id, label: `${student.name}${student.archived ? '（已归档）' : ''}` }));
}

export function Dashboard({ data, openStudent, addStudent, addLesson, openLesson, newReport }: {
  data: AppData; openStudent: (id: string) => void; addStudent: () => void; addLesson: () => void;
  openLesson: (lesson: Lesson) => void; newReport: () => void;
}) {
  const active = data.students.filter(student => !student.archived);
  const month = monthPeriod(today().slice(0, 7));
  const monthLessons = data.lessons.filter(lesson => lesson.lesson_date >= month.start && lesson.lesson_date <= month.end);
  const counts = masteryCounts(data);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const recent = [...data.lessons].sort((a, b) => b.lesson_date.localeCompare(a.lesson_date) || b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const columns: TableColumnsType<Lesson> = [
    { title: '日期', dataIndex: 'lesson_date', width: 112, render: displayDate },
    { title: '学生', width: 116, render: (_, lesson) => <Button type="link" style={{ padding: 0 }} onClick={() => openStudent(lesson.student_id)}>{data.students.find(student => student.id === lesson.student_id)?.name ?? '学生记录'}</Button> },
    { title: '课堂内容', dataIndex: 'content', render: value => <Paragraph ellipsis={{ rows: 2, tooltip: value }} style={{ margin: 0 }}>{value}</Paragraph> },
    { title: '课后反馈', width: 120, render: (_, lesson) => <Tag color={lesson.feedback ? 'success' : 'default'}>{lesson.feedback ? '已有反馈' : '待整理'}</Tag> },
    { title: '操作', width: 90, render: (_, lesson) => <Button type="link" size="small" onClick={() => openLesson(lesson)}>查看反馈</Button> },
  ];
  const stats = [
    { title: '在读学生', value: active.length, suffix: '位', icon: <TeamOutlined />, note: '当前正在辅导的学生' },
    { title: '本月课堂', value: monthLessons.length, suffix: '次', icon: <CalendarOutlined />, note: `${today().slice(0, 7).replace('-', ' 年 ')} 月` },
    { title: '薄弱知识点', value: counts.weak, suffix: '项', icon: <AimOutlined />, note: '按每位学生的知识记录统计' },
    { title: '本月报告', value: data.reports.filter(report => report.period_start >= month.start && report.period_start <= month.end).length, suffix: '份', icon: <FileTextOutlined />, note: '已生成并固定保存' },
  ];
  return <div className="page-stack">
    <ViewHeading title="学习概览" description="查看近期课堂、学生档案与当前掌握情况。" action={<Button type="primary" icon={<PlusOutlined />} onClick={active.length ? addLesson : addStudent}>{active.length ? '记录课堂' : '添加第一位学生'}</Button>} />
    <Card className="overview-stats" variant="borderless">
      <section className="metric-grid" aria-label="教学概览统计">{stats.map(stat => <div className="metric-item" role="group" aria-label={stat.title} key={stat.title}>
        <Statistic title={<div className="metric-heading"><Text className="metric-label">{stat.title}</Text><span className="metric-icon" aria-hidden>{stat.icon}</span></div>}
          value={stat.value} suffix={<span className="metric-unit">{stat.suffix}</span>} />
        <Text className="metric-note">{stat.note}</Text>
      </div>)}</section>
    </Card>
    <Row gutter={[16, 16]} align="stretch">
      <Col xs={24} xl={16}><Card title="最近课堂" style={{ height: '100%' }} extra={active.length > 0 && <Button type="link" onClick={addLesson}>新增记录</Button>}>
        <Table<Lesson> rowKey="id" columns={columns} dataSource={recent} size="small" pagination={false} scroll={{ x: 640 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有课堂记录，先记下一次课堂内容。" /> }} />
      </Card></Col>
      <Col xs={24} xl={8}><Card title="掌握情况概览" style={{ height: '100%' }} extra={<Text type="secondary">共 {total} 项</Text>}>
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>{STATUS_OPTIONS.map(status => <div key={status.value}>
          <Flex justify="space-between" align="center"><MasteryTag status={status.value} /><Text>{counts[status.value]} 项</Text></Flex>
          <Progress percent={total ? Math.round(counts[status.value] / total * 100) : 0} showInfo={false} strokeColor={progressColors[status.value]} size="small" />
        </div>)}<Text type="secondary">统计在读学生的已关联知识点，掌握状态由你确认。</Text></Space>
      </Card></Col>
    </Row>
    <Card title="我的学生" extra={<Button type="link" icon={<PlusOutlined />} onClick={addStudent}>添加学生</Button>}>
      {active.length > 0 ? <Row gutter={[16, 16]}>{active.slice(0, 6).map(student => {
        const count = masteryCounts(data, student.id);
        return <Col xs={24} md={12} xl={8} key={student.id}><Card size="small">
          <Card.Meta avatar={<Avatar className="accent-avatar">{student.name.slice(0, 1)}</Avatar>} title={student.name} description={`${student.grade || '年级未填写'} · 数学`} />
          <Flex wrap gap={8} justify="space-between" align="center" style={{ marginTop: 16 }}><Space size={4} wrap>
            <Tag>{data.lessons.filter(lesson => lesson.student_id === student.id).length} 次课堂</Tag>{count.weak > 0 && <Tag color="error">{count.weak} 项薄弱</Tag>}
          </Space><Button type="link" size="small" onClick={() => openStudent(student.id)}>查看档案<ArrowRightOutlined /></Button></Flex>
        </Card></Col>;
      })}</Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="添加学生档案，开始记录课堂与知识掌握情况。"><Button type="primary" onClick={addStudent}>添加学生</Button></Empty>}
    </Card>
    {active.length > 0 && <Card size="small"><Flex gap={16} wrap justify="space-between" align="center">
      <Space><FileTextOutlined style={{ fontSize: 20, color: 'var(--workbench-accent)' }} /><Text>汇总课堂观察、知识掌握与后续计划，生成学习力报告。</Text></Space>
      <Button onClick={newReport} icon={<PlusOutlined />}>生成月报</Button>
    </Flex></Card>}
  </div>;
}

type KnowledgeRow = StudentKnowledge & { point: KnowledgePoint };

export function StudentsView({ data, selectedId, selectStudent, category, changeCategory, addStudent, editStudent, addLesson, openLesson, editLesson, removeLesson, mastery, assign, insights, busy, archive }: {
  data: AppData; selectedId: string; selectStudent: (id: string) => void; addStudent: () => void;
  category: 'active' | 'archived'; changeCategory: (category: 'active' | 'archived') => void;
  editStudent: (student: Student) => void; addLesson: () => void; mastery: (current?: StudentKnowledge) => void;
  assign: () => void; insights: () => void; busy: boolean; archive: (student: Student) => void;
  openLesson: (lesson: Lesson) => void; editLesson: (lesson: Lesson) => void; removeLesson: (lesson: Lesson) => void;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MasteryStatus>();
  const categoryLabel = category === 'active' ? '在读学生' : '已归档学生';
  const students = data.students.filter(student => student.archived === (category === 'archived') && `${student.name}${student.grade}`.includes(search.trim()));
  const selected = data.students.find(student => student.id === selectedId && student.archived === (category === 'archived'));
  const points = new Map(data.knowledgePoints.map(point => [point.id, point]));
  const rows: KnowledgeRow[] = data.studentKnowledge.flatMap(current => {
    const point = points.get(current.knowledge_point_id);
    return current.student_id === selected?.id && (!status || current.status === status) && point && !point.archived ? [{ ...current, point }] : [];
  });
  const columns: TableColumnsType<KnowledgeRow> = [
    { title: '知识点', width: 240, render: (_, row) => <Space orientation="vertical" size={2}><Text strong>{row.point.title}</Text><Text type="secondary">{row.point.grade} · {row.point.chapter}</Text></Space> },
    { title: '掌握情况', dataIndex: 'status', width: 120, render: value => <MasteryTag status={value} /> },
    { title: '判断依据', dataIndex: 'note', render: value => <Paragraph ellipsis={{ rows: 3, tooltip: value }} style={{ margin: 0 }}>{value || '—'}</Paragraph> },
    { title: '操作', width: 96, render: (_, row) => <Button type="link" size="small" icon={<EditOutlined />} aria-label={`修改${row.point.title}掌握情况`} disabled={busy || selected?.archived} onClick={() => mastery(row)}>修改</Button> },
  ];
  return <div className="page-stack">
    <ViewHeading title="学生档案" description="独立记录每位学生的学习目标、课堂情况与知识掌握。" action={<Button type="primary" icon={<PlusOutlined />} disabled={busy} onClick={addStudent}>添加学生</Button>} />
    <Row gutter={[16, 16]} align="top">
      <Col xs={24} lg={7} xl={6}><Card title="学生列表" size="small" extra={<Text type="secondary">{students.length} 位</Text>}>
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Input prefix={<SearchOutlined />} aria-label="搜索学生" placeholder="搜索姓名或年级" allowClear value={search} onChange={event => setSearch(event.target.value)} />
          <Select<'active' | 'archived'> aria-label="学生分类" value={category} onChange={changeCategory} disabled={busy}
            options={[{ value: 'active', label: '在读学生' }, { value: 'archived', label: '已归档学生' }]} style={{ width: '100%' }} />
          <Space orientation="vertical" size={4} className="student-picker-list" style={{ width: '100%' }}>{students.map(student => <Button block key={student.id} className="student-list-row"
            type="text" aria-pressed={selected?.id === student.id} onClick={() => selectStudent(student.id)}>
            <Avatar size={32} className="accent-avatar">{student.name.slice(0, 1)}</Avatar>
            <Space orientation="vertical" size={0}><Text strong className="student-list-name">{student.name}</Text>
              <Text className="student-list-meta">{student.grade || '年级未填写'}{student.archived ? ' · 已归档' : ''}</Text>
            </Space>
          </Button>)}{students.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search.trim() ? `没有匹配的${categoryLabel}` : `暂无${categoryLabel}`} />}</Space>
        </Space>
      </Card></Col>
      <Col xs={24} lg={17} xl={18}>{selected ? <div className="page-stack">
        <Card className="student-profile" extra={<Button icon={<EditOutlined />} disabled={busy} onClick={() => editStudent(selected)}>编辑档案</Button>}
          title={<Space><Avatar className="accent-avatar">{selected.name.slice(0, 1)}</Avatar><Text strong>{selected.name}</Text><Tag className={selected.archived ? undefined : 'accent-tag'}>{selected.archived ? '已归档' : '在读'}</Tag></Space>}>
          <Descriptions size="small" column={1} items={[
            { key: 'grade', label: '年级学科', children: `${selected.grade || '年级未填写'} · 数学` },
            { key: 'start', label: '开始日期', children: selected.start_date ? displayDate(selected.start_date) : '尚未填写' },
            { key: 'school', label: '学校', children: <Text className="prewrap">{selected.school || '未填写'}</Text> },
            { key: 'goal', label: '学习目标', children: <Text style={{ whiteSpace: 'pre-wrap' }}>{selected.goal || '尚未填写学习目标'}</Text> },
            { key: 'traits', label: '学生特点', children: <Text className="prewrap">{selected.traits || '未填写'}</Text> },
            { key: 'parent_requirements', label: '家长要求', children: <Text className="prewrap">{selected.parent_requirements || '未填写'}</Text> },
            { key: 'school_context', label: '学校情况', children: <Text className="prewrap">{selected.school_context || '未填写'}</Text> },
            ...(selected.notes ? [{ key: 'notes', label: '备注', children: <Text style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</Text> }] : []),
          ]} />
          <Space wrap style={{ marginTop: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} disabled={busy} onClick={addLesson}>记录课堂</Button>
            <Button icon={<ThunderboltOutlined />} loading={busy} onClick={insights}>AI 学情建议</Button>
            <Button type="text" danger={!selected.archived} disabled={busy} onClick={() => archive(selected)}>{selected.archived ? '恢复学生' : '归档学生'}</Button>
          </Space>
        </Card>
        <Card className="student-record-tabs"><Tabs defaultActiveKey="lessons" items={[
          { key: 'lessons', label: '课堂记录', children: <LessonRecords key={selected.id} data={data} studentId={selected.id} add={addLesson} open={openLesson} edit={editLesson} remove={removeLesson} busy={busy} /> },
          { key: 'knowledge', label: '知识掌握', children: <>
          <div className="section-actions"><Button icon={<PlusOutlined />} disabled={selected.archived || busy} onClick={() => mastery()}>关联知识点</Button></div>
          <div className="filter-bar"><Select<MasteryStatus> aria-label="筛选掌握状态" placeholder="全部掌握状态" allowClear value={status} onChange={setStatus} options={[...STATUS_OPTIONS]} style={{ width: 176 }} />
            <Button type="link" disabled={busy || selected.archived || !selected.grade} onClick={assign}>关联本年级目录</Button><Text type="secondary">{rows.length} 项知识记录</Text>
          </div>
          <Table<KnowledgeRow> key={`${selected.id}:${status ?? 'all'}`} rowKey="id" columns={columns} dataSource={rows} size="small" pagination={pagination} scroll={{ x: 720 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={status ? '没有这个状态的知识点' : '从共用目录关联知识点，开始记录掌握情况。'} /> }} />
          </> },
        ]} /></Card>
      </div> : <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={category === 'active' ? '添加在读学生，开始记录档案与掌握情况。' : '暂无已归档学生。'}>
        {category === 'active' && <Button type="primary" disabled={busy} onClick={addStudent}>添加学生</Button>}
      </Empty></Card>}</Col>
    </Row>
  </div>;
}

export function LessonsView({ data, ...actions }: LessonActions & { data: AppData }) {
  return <div className="page-stack">
    <ViewHeading title="课堂记录" description="记录课堂事实，再整理为清楚的课后反馈。" action={<Button type="primary" icon={<PlusOutlined />} disabled={!data.students.some(item => !item.archived) || actions.busy} onClick={actions.add}>记录课堂</Button>} />
    <Card><LessonRecords data={data} {...actions} /></Card>
  </div>;
}

export function KnowledgeView({ data, add, edit, archive }: { data: AppData; add: () => void; edit: (point: KnowledgePoint) => void; archive: (point: KnowledgePoint) => void }) {
  const [grade, setGrade] = useState<string>();
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const grades = [...new Set(data.knowledgePoints.map(point => point.grade))];
  const rows = data.knowledgePoints.filter(point => (archived || !point.archived) && (!grade || point.grade === grade) && `${point.chapter}${point.title}`.includes(search.trim()));
  const columns: TableColumnsType<KnowledgePoint> = [
    { title: '年级', dataIndex: 'grade', width: 128 },
    { title: '章节', dataIndex: 'chapter', width: 210 },
    { title: '知识点', render: (_, point) => <Space wrap><Text strong>{point.title}</Text>{point.archived && <Tag>已移除</Tag>}</Space> },
    { title: '操作', width: 156, render: (_, point) => <Space size={0}><Button type="link" size="small" icon={<EditOutlined />} aria-label={`编辑${point.title}`} onClick={() => edit(point)}>编辑</Button>{point.archived
      ? <Button type="link" size="small" onClick={() => archive(point)}>恢复</Button>
      : <Popconfirm title="删除这个知识点选项？" description="将从可选列表中移除，已有课堂和月报保留。" okText="删除" cancelText="取消" onConfirm={() => archive(point)}><Button type="link" danger size="small">删除</Button></Popconfirm>}</Space> },
  ];
  return <div className="page-stack">
    <ViewHeading title="数学知识目录" description="按年级和章节维护共用目录，为每位学生关联适用知识点。" action={<Button type="primary" icon={<PlusOutlined />} onClick={add}>添加知识点</Button>} />
    <Card title="共用知识目录" extra={<Text type="secondary">{rows.length} 个知识点</Text>}><div className="filter-bar">
      <Select aria-label="筛选知识目录年级" placeholder="全部年级" allowClear value={grade} onChange={setGrade} options={grades.map(value => ({ value, label: value }))} style={{ width: 180 }} />
      <Input prefix={<SearchOutlined />} aria-label="搜索知识点" placeholder="搜索章节或知识点" value={search} allowClear onChange={event => setSearch(event.target.value)} style={{ width: 280, maxWidth: '100%' }} />
      <Checkbox checked={archived} onChange={event => setArchived(event.target.checked)}>包含已移除选项</Checkbox>
    </div>
      <Table<KnowledgePoint> key={`${grade ?? ''}:${search}:${archived}`} rowKey="id" columns={columns} dataSource={rows} size="small" pagination={pagination} scroll={{ x: 720 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={grade || search ? '没有匹配的知识点，请调整筛选条件。' : '按年级和章节添加知识点，建立共用目录。'}><Button icon={<PlusOutlined />} onClick={add}>添加知识点</Button></Empty> }} />
    </Card>
  </div>;
}

export function ReportsView({ data, add, open }: { data: AppData; add: () => void; open: (report: MonthlyReport) => void }) {
  const [student, setStudent] = useState<string>();
  const [page, setPage] = useState(1);
  const rows = data.reports.filter(report => !student || report.student_id === student);
  const pageSize = 6;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="page-stack">
    <ViewHeading title="学习力报告" description="汇总所选周期的课堂观察、学习水平与后续计划。" action={<Button type="primary" icon={<PlusOutlined />} disabled={!data.students.some(item => !item.archived)} onClick={add}>生成月报</Button>} />
    <Card><div className="filter-bar">
      <Select aria-label="按学生筛选月报" placeholder="全部学生" showSearch optionFilterProp="label" allowClear value={student} onChange={value => { setStudent(value); setPage(1); }} options={studentOptions(data.students)} style={{ width: 180 }} />
      <Text type="secondary">{rows.length} 份已保存 · 生成后固定归档</Text>
    </div>
      {rows.length > 0 ? <Space orientation="vertical" size={20} style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>{pageRows.map(report => <Col xs={24} md={12} xl={8} key={report.id}>
          <Card className="report-card" size="small" style={{ height: '100%' }} title={<Space><FileTextOutlined style={{ color: 'var(--workbench-accent)' }} /><Text strong>{report.snapshot.student.name}</Text></Space>} extra={<Tag className="accent-tag">已归档</Tag>}>
            <Space orientation="vertical" size={12} style={{ width: '100%' }}><Text strong>{report.title}</Text>
              <Space orientation="vertical" size={4}><Text type="secondary">{displayDate(report.period_start)} — {displayDate(report.period_end)}</Text><Text>{report.snapshot.lessons.length} 次课堂记录</Text><Text type="secondary">生成于 {displayDate(report.created_at)}</Text></Space>
              <Button block onClick={() => open(report)}>查看与导出<ArrowRightOutlined /></Button>
            </Space>
          </Card>
        </Col>)}</Row>
        <Pagination align="end" responsive current={currentPage} pageSize={pageSize} total={rows.length} onChange={setPage} showSizeChanger={false} hideOnSinglePage showTotal={total => `共 ${total} 份报告`} />
      </Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={student ? '这位学生还没有学习力报告。' : '记录课堂后，选择学生与周期生成第一份报告。'} />}
    </Card>
  </div>;
}
