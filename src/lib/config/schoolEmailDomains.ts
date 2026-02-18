// 杭州院校邮箱域名白名单
export const ALLOWED_SCHOOL_EMAIL_DOMAINS = [
  "zju.edu.cn", // 浙江大学
  "hznu.edu.cn", // 杭州师范大学
  "hdu.edu.cn", // 杭州电子科技大学
  "zjut.edu.cn", // 浙江工业大学
  "zufe.edu.cn", // 浙江财经大学
  "zjsu.edu.cn", // 浙江工商大学
  "cjlu.edu.cn", // 中国计量大学
  "zstu.edu.cn", // 浙江理工大学
  "zafu.edu.cn", // 浙江农林大学
  "zisu.edu.cn", // 浙江外国语学院
  "cmc.edu.cn", // 浙江传媒学院
  "caa.edu.cn", // 中国美术学院
  "zjcm.edu.cn", // 浙江音乐学院
];

// 获取运行时配置（允许环境变量覆盖）
export const getSchoolEmailDomains = () => {
  const envDomains = process.env.SCHOOL_EMAIL_DOMAINS;
  if (envDomains) {
    return envDomains.split(",").map((d) => d.trim());
  }
  return ALLOWED_SCHOOL_EMAIL_DOMAINS;
};
