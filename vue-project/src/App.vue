<template>
  <header>
    <nav>
      <router-link to="/">仪表盘</router-link>
      <router-link to="/stake">质押</router-link>
      <router-link to="/withdraw">提现</router-link>
      <router-link to="/profile">个人信息</router-link>
    </nav>
  </header>
  
  <router-view />
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 40px;
}

nav {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

nav a {
  color: #2c3e50;
  text-decoration: none;
  font-weight: bold;
  padding: 10px;
  border-radius: 4px;
}

nav a.router-link-exact-active {
  color: white;
  background-color: #42b983;
}
</style>