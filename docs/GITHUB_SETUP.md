# 🔗 GitHub Setup for Auto-Deployment

## Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click "New repository"
3. Name: `school-lunch-checker`
4. Make it **Public** (free)
5. **Don't** initialize with README
6. Click "Create repository"

## Step 2: Connect Your Local Code
Copy your repository URL and run:

```bash
git remote add origin https://github.com/YOURUSERNAME/school-lunch-checker.git
git branch -M main
git push -u origin main
```

Replace `YOURUSERNAME` with your actual GitHub username.

## Step 3: Connect Netlify to GitHub
1. Go to your **Netlify dashboard**
2. Click your site name
3. Go to **"Site settings"** → **"Build & deploy"**
4. Click **"Link to repository"**
5. Choose **GitHub** and select your repository
6. Set build settings:
   - **Build command**: `echo "Static site"`
   - **Publish directory**: `web_app`

## Step 4: Test Auto-Deploy
Make any small change to your code and push:
```bash
git add .
git commit -m "Test auto-deploy"
git push
```

Netlify will automatically rebuild and deploy! 🚀

## 🎉 Result
- ✅ **Auto-deploy**: Every git push updates your live site
- ✅ **Version control**: Track all changes
- ✅ **Rollback**: Easy to revert if needed
- ✅ **Collaboration**: Others can contribute
