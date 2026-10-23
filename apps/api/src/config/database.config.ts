export default {
  url:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/video_transcoding',
};
