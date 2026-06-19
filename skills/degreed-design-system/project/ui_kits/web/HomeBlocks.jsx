/* eslint-disable */
// Hero greeting + content carousels that fill the home screen.

const HeroGreeting = ({ name }) => (
  <div style={{
    background: 'linear-gradient(135deg, #E9F7FE 0%, #F3FBFF 100%)',
    borderRadius: 16, padding: '28px 32px',
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
    marginBottom: 32,
  }}>
    <div>
      <Eyebrow color="#0062E3">Welcome back</Eyebrow>
      <h1 style={{ margin: '8px 0 4px', font: '700 30px/36px Inter, sans-serif', color: '#0F1F2C', letterSpacing: '-0.01em' }}>
        Pick up where you left off, {name}.
      </h1>
      <p style={{ margin: 0, font: '400 14px/22px Inter, sans-serif', color: '#44515A' }}>
        You're 3 hours away from finishing <strong style={{ fontWeight: 590 }}>Practical SQL for Analysts</strong>.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button variant="primary" icon="play">Continue</Button>
        <Button variant="secondary">View plan</Button>
      </div>
    </div>
    <img src="../../assets/illustrations/curious-cat.png" style={{ height: 140, width: 'auto', display: 'block' }} alt="" />
  </div>
);

const ContentCard = ({ item, onClick }) => (
  <Card>
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{
        height: 120, background: item.thumbBg || 'linear-gradient(135deg, #E9F7FE, #D6F0FF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
        position: 'relative', overflow: 'hidden',
      }}>
        {item.illust
          ? <img src={`../../assets/illustrations/${item.illust}.png`} style={{ height: 100 }} />
          : <img src={`../../assets/icons/${item.icon || 'course'}.svg`} style={{ width: 32, height: 32, opacity: .5 }} />}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <Chip tone="solid">{item.type}</Chip>
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <Eyebrow>{item.provider}</Eyebrow>
        <div style={{ font: '590 15px/20px Inter, sans-serif', color: '#0F1F2C', margin: '6px 0 8px' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 12px/16px Inter, sans-serif', color: '#5B737F' }}>
          <span>{item.duration}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#A3B5BD' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <img src="../../assets/icons/star.svg" width={12} height={12} /> {item.rating}
          </span>
        </div>
      </div>
    </div>
  </Card>
);

const ContinueRow = ({ item, progress }) => (
  <Card>
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 16, padding: 12, alignItems: 'center' }}>
      <div style={{
        height: 90, background: 'linear-gradient(135deg, #E9F7FE, #D6F0FF)',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={`../../assets/icons/${item.icon}.svg`} style={{ width: 28, height: 28, opacity: .55 }} />
      </div>
      <div>
        <Eyebrow>{item.type} · {item.provider}</Eyebrow>
        <div style={{ font: '590 16px/22px Inter, sans-serif', color: '#0F1F2C', margin: '4px 0 8px' }}>{item.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, maxWidth: 240, height: 6, background: '#E2E8EB', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#0062E3' }} />
          </div>
          <span style={{ font: '500 12px/1 Inter, sans-serif', color: '#5B737F' }}>{progress}% · {item.remaining} left</span>
        </div>
      </div>
      <Button variant="primary" icon="play">Resume</Button>
    </div>
  </Card>
);

const SkillReview = () => (
  <Card padding={20}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: '#FFECE8', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src="../../assets/icons/dart.svg" width={20} height={20} />
      </div>
      <div>
        <Eyebrow color="#C3008D">Skill review</Eyebrow>
        <div style={{ font: '700 18px/24px Inter, sans-serif', color: '#0F1F2C', marginTop: 2 }}>3 skills due this week</div>
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <SkillChip name="React" level={5} />
      <SkillChip name="SQL" level={3} />
      <SkillChip name="Leadership" level={2} />
    </div>
    <Button variant="secondary" full>Start review</Button>
  </Card>
);

Object.assign(window, { HeroGreeting, ContentCard, ContinueRow, SkillReview });
