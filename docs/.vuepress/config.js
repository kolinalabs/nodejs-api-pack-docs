module.exports = {
  title: "NodeJS ApiPack",
  description: "Just playing around",
  base: "/nodejs-api-pack-docs/",
  themeConfig: {
    displayAllHeaders: true,
    sidebar: ["/", "/express", "/koa", "/mongoose"],
    nav: [
      {
        text: "ApiPack(Core)",
        link: "https://github.com/kolinalabs/nodejs-api-pack"
      },
      {
        text: "ApiPack(Mongoose)",
        link: "https://github.com/kolinalabs/api-pack-mongoose"
      }
    ]
  }
};
