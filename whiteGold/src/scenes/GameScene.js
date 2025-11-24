// -----------------------------------------------------------------------------
// GameScene.js: define a cena principal do jogo
// -----------------------------------------------------------------------------

import Phaser from 'phaser';

// -----------------------------------------------------------------------------

// Classe que representa a cena principal do jogo
export default class GameScene extends Phaser.Scene {

  constructor(config) {
    super({ key: 'GameScene' }, config);
    this.config = config;
  }

  // Inicializa as propriedades da cena
  init() {

    // Distância mínima para o ataque do inimigo
    this.distanceToAttack = 250;

    // Player
    this.player = null;
    this.playerSpeed = 300;
    this.projectiles = null;

    //inimigo
    this.enemies = null;
    this.mobsDefeated = 0; // Contador
    this.maxMobsBeforeBoss = 5; // Meta De Kills

    this.clouds = null;

    this.playerMaxHealth = 5;
    this.playerHealth = this.playerMaxHealth;
    this.hearts = [];

    this.isInvulnerable = false;

  }

  // Cria os elementos visuais e lógicos da cena
  create() {

    // Cenário e Animações
    this.createBackground();
    this.registerPlayerAnimations();
    this.registerProjectileAnimations();
    this.registerEnemyAnimations();
    this.registerBossAnimations();


    this.enemyProjectiles = this.physics.add.group();
    this.createProjectilesGroup();


    this.createPlayer();

    this.createHealingHeartsGroup();
    this.createEnemyGroup();


    // Restante das Configurações
    this.createHealthHUD();
    this.player.setCollideWorldBounds(true);
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.input.mouse.disableContextMenu();

    // Colisões Manuais
    this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
      projectile.destroy();
      this.playerHit(player, projectile);
    }, null, this);

    this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);

    this.player.on('animationcomplete-player_attack', this.onPlayerAttackComplete, this);
    this.player.on('animationupdate', this.onPlayerAttackFrame, this);

    // Timers
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    this.time.addEvent({
      delay: 8000,
      callback: this.spawnHealingHeart,
      callbackScope: this,
      loop: true
    });

  }

  // Atualiza a lógica do jogo a cada frame
  update() {

    // Obtém a referências para as teclas
    const { left, right, up, down, space } = this.cursorKeys;


    // Faz com que a tecla de espaço seja contabilizada uma
    // única vez, mesmo se ela estiver sendo pressionada
    const isSpaceJustDown = Phaser.Input.Keyboard.JustDown(space);

    // Indica se o player está executando alguma animação
    const currentPlayerAnim = this.player.anims.currentAnim?.key;


    // Verifica se o player está executando uma animação específica (animKey)
    const isPlayerPlaying = animKey => this.player.anims.isPlaying && currentPlayerAnim === animKey;

    // Zera a velocidade do corpo em todos os frames para evitar inércia contínua
    this.player.setVelocity(0);

    // Seta para a esquerda: movimenta o player para a esquerda
    if (left.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
      this.player.setFlipX(true);
    }
    // Seta para a direita: movimenta o player para a direita
    else if (right.isDown) {
      this.player.setVelocityX(this.playerSpeed);
      this.player.setFlipX(false);
    }

    // Seta para cima: movimenta o player para cima
    if (up.isDown) {
      this.player.setVelocityY(-this.playerSpeed);
    }
    // Seta para baixo: movimenta o player para baixo
    else if (down.isDown) {
      this.player.setVelocityY(this.playerSpeed);
    }

    // Espaço: faz o player atacar
    if (isSpaceJustDown && !isPlayerPlaying('player_attack')) {
      this.player.play('player_attack');
      return;
    }

    // Se o player estiver atacando, interrompe as outras animações
    if (isPlayerPlaying('player_attack')) {
      return;
    }

    // Logica de animação de Voo
    // Se o player estiver se movendo (em X ou Y)
    if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
      if (currentPlayerAnim !== 'player_idle') {
        this.player.play('player_idle', true);
      }
    }
    // Se o player estiver parado
    else {
      if (currentPlayerAnim !== 'player_idle') {
        this.player.play('player_idle', true);
      }
    }

    this.clouds.children.iterate((cloud) => {
      if (cloud && cloud.x < -200) {
        cloud.setActive(false);
        cloud.setVisible(false);
      }
    });

  }

  // Método para criar o cenário de fundo
  createBackground() {
    //  Fundo Fixo
    this.add.image(this.config.width / 2, this.config.height / 2, 'bg1')
      .setScrollFactor(0)
      .setDisplaySize(this.config.width, this.config.height);

    //  Lua (Canto superior direito)
    this.add.image(this.config.width - 100, 100, 'moon')
      .setScale(0.5)
      .setScrollFactor(0);

    // Grupo de Nuvens (Com Física para se moverem)
    this.clouds = this.physics.add.group();

    // Spawna nuvens iniciais para a tela não começar vazia
    this.spawnCloud(this.config.width / 2);
    this.spawnCloud(this.config.width / 4);
    this.spawnCloud(this.config.width + 100);

    // Timer: Cria uma nuvem nova a cada 3 segundos
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnCloud,
      callbackScope: this,
      loop: true
    });
  }

  spawnCloud(xOffset) {
    // Escolhe aleatoriamente entre cloud1, cloud2, cloud3, cloud4
    const cloudKey = 'cloud' + Phaser.Math.Between(1, 4);

    // Posição X (se não passado, cria fora da tela na direita)
    const startX = xOffset || (this.config.width + 150);

    // Posição Y aleatória no céu
    const startY = Phaser.Math.Between(50, this.config.height / 2);

    // Pega uma nuvem do grupo ou cria nova
    let cloud = this.clouds.get(startX, startY, cloudKey);

    if (cloud) {
      cloud.setActive(true);
      cloud.setVisible(true);
      cloud.setTexture(cloudKey);

      cloud.setDepth(0);

      const scale = Phaser.Math.FloatBetween(0.5, 1.0);
      cloud.setScale(scale);
      cloud.setAlpha(0.9);

      // Física: Move para a esquerda
      // Nuvens menores se movem mais devagar 
      const speed = 50 * scale;
      cloud.body.setVelocityX(-speed);
      cloud.body.setAllowGravity(false); // Nuvem não cai
    }
  }


  // Método para criar o chão da cena
  createGround() {

    // Cria um retângulo para representar o chão
    const groundRect = this.add.rectangle(
      this.config.width / 2,
      this.config.height - 0.5 + 260,
      this.config.width,
      20,
      0x00ff00,
      0.25
    ).setVisible(false);

    // Adiciona um corpo físico do tipo estático
    this.physics.add.existing(groundRect, true);

    // Atribui o retângulo do chão à cena, permitindo a aplicação de colisões
    this.ground = groundRect;

  }

  // Método para criar o player
  createPlayer() {
    this.player = this.physics.add.sprite(
      200,
      this.config.height * 0.5,
      'player'
    ).setScale(0.25);

    // --- HITBOX DO PLAYER ---

    const hitWidth = 624 * 0.5;  
    const hitHeight = 554 * 0.6; 

    this.player.body.setSize(hitWidth, hitHeight);

    // Centraliza o hitbox na imagem
    const offsetX = (624 - hitWidth) / 2;
    const offsetY = (554 - hitHeight) / 2;
    this.player.body.setOffset(offsetX, offsetY);

    this.player.play('player_idle', true);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
  }

  registerPlayerAnimations() {

    // Cria a animação do player parado (IDLE/Voo)
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1
    });

    // Cria a animação do player atacando
    this.anims.create({
      key: 'player_attack',
      frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
      frameRate: 12,
      repeat: 0
    });

  }

  registerProjectileAnimations() {
    this.anims.create({
      key: 'fire_loop',
      frames: this.anims.generateFrameNumbers('fireball', { start: 0, end: 7 }),
      frameRate: 15,
      repeat: -1
    });
  }

  // Método chamado ao final da animação de ataque
  onPlayerAttackComplete(animation, frame) {
    if (animation.key === 'player_attack') {
      // Volta para a animação de idle após o ataque
      this.player.play('player_idle', true);
    }
  }

  onPlayerAttackFrame(animation, frame) {
    if (animation.key === 'player_attack') {
      // O 'frame.index' conta os frames da animação atual (de 1 a 4) e atira no ultimo frame
      if (frame.index === 4) {
        this.shootProjectile();
      }
    }
  }

  // Cria o grupo de projéteis para gerenciamento de colisões e pooling
  createProjectilesGroup() {
    this.projectiles = this.physics.add.group({
      defaultKey: 'fireball',
      runChildUpdate: true
    });
  }

  // Lógica de disparo
  shootProjectile() {
    // Pega um projétil do grupo
    const projectile = this.projectiles.get(this.player.body.center.x, this.player.body.center.y);

    if (projectile) {
      projectile.enableBody(true, this.player.body.center.x, this.player.body.center.y, true, true);

      // Garante que a gravidade continue desligada (as vezes o reset liga de volta)
      projectile.body.setAllowGravity(false);

      projectile.setFrame(0);
      projectile.setScale(0.15);
      projectile.play('fire_loop', true);

      projectile.setDepth(10);

      projectile.body.setSize(projectile.width * 0.5, projectile.height * 0.6, true);

      const direction = this.player.flipX ? -1 : 1;
      const projectileSpeed = 800;
      projectile.setVelocityX(direction * projectileSpeed);
      projectile.setFlipX(direction < 0 ? false : true);

      // Se já existia um timer de morte nesse objeto específico, cancela ele.
      if (projectile.lifeTimer) {
        projectile.lifeTimer.remove();
      }

      // Cria um novo timer e anexa ao projétil
      projectile.lifeTimer = this.time.delayedCall(2000, () => {
        if (projectile.active) { // Só desativa se ainda estiver ativo
          projectile.disableBody(true, true);
        }
      }, [], this);
    }
  }


  // Cria o HUD de vida 
  createHealthHUD() {
    const heartSpacing = 50;
    const initialX = 50;
    const initialY = 30;

    for (let i = 0; i < this.playerMaxHealth; i++) {
      const heart = this.add.image(
        initialX + i * heartSpacing,
        initialY,
        'heart'
      ).setScrollFactor(0) // Faz o HUD acompanhar a câmera
        .setDepth(10)      
        .setScale(0.05);
      this.hearts.push(heart);
    }
  }

  // Função para atualizar o visual do HUD
  updateHealthHUD() {
    for (let i = 0; i < this.playerMaxHealth; i++) {
      // Se o índice for menor que a vida atual, mostra o coração
      this.hearts[i].setVisible(i < this.playerHealth);
    }
  }

  takeDamage(amount) {
    // Se já morreu, não faz nada
    if (this.playerHealth <= 0) return;

    this.playerHealth -= amount;

    // Atualiza o visual dos corações
    for (let i = 0; i < this.hearts.length; i++) {
      if (i < this.playerHealth) {
        this.hearts[i].setVisible(true);
      } else {
        this.hearts[i].setVisible(false);
      }
    }

    if (this.playerHealth <= 0) {
      // Pausa a física e pinta o jogador de vermelho escuro
      this.physics.pause();
      this.player.setTint(0xff0000);

      this.showGameOver();
    }
  }

  // Método para curar o player
  heal(amount) {
    this.playerHealth += amount;
    if (this.playerHealth > this.playerMaxHealth) {
      this.playerHealth = this.playerMaxHealth;
    }
    this.updateHealthHUD();
  }


  registerBossAnimations() {

    // IDLE
    this.anims.create({
      key: 'boss_idle',
      frames: this.anims.generateFrameNumbers('boss', { start: 15, end: 19 }),
      frameRate: 8,
      repeat: -1
    });

    // ATAQUE 1 
    this.anims.create({
      key: 'boss_atk1',
      frames: this.anims.generateFrameNumbers('boss', { start: 20, end: 23 }),
      frameRate: 10,
      repeat: 0
    });

    // ATAQUE 2
    this.anims.create({
      key: 'boss_atk2',
      frames: this.anims.generateFrameNumbers('boss', { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13] }), // definido assim pois o frame 9 deve ser ignorado
      frameRate: 12,
      repeat: 0
    });

    // MORTE 
    this.anims.create({
      key: 'boss_die',
      frames: this.anims.generateFrameNumbers('boss', { start: 25, end: 26 }),
      frameRate: 1,
      repeat: 0
    });

    // PROJETEIS

    // Bola de Fogo 
    this.anims.create({
      key: 'anim_enemy_fireball',
      frames: this.anims.generateFrameNumbers('enemy_fireball', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    // Meteoro
    this.anims.create({
      key: 'anim_enemy_meteor',
      frames: this.anims.generateFrameNumbers('enemy_meteor', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
  }

  // GameScene.js

  // LÓGICA DO BOSS 

  spawnBoss() {
    const x = this.config.width + 200;
    const y = this.config.height / 2;

    this.boss = this.physics.add.sprite(x, y, 'boss');

    this.boss.setScale(0.4);
    this.boss.setDepth(10);
    this.boss.body.setAllowGravity(false);
    this.boss.setImmovable(true);

    // HITBOX DO BOSS
    const hitWidth = 920 * 0.6;
    const hitHeight = 720 * 0.7;

    // Define o tamanho da caixa de colisão
    this.boss.body.setSize(hitWidth, hitHeight);

    // Centraliza essa caixa dentro do sprite
    const offsetX = (920 - hitWidth) / 2;
    const offsetY = (720 - hitHeight) / 2;
    this.boss.body.setOffset(offsetX, offsetY);

    // Status do Boss
    this.boss.health = 20;
    this.boss.maxHealth = 20;
    this.boss.isAttacking = false;
    this.boss.isDead = false; // Trava de segurança para o boss não morrer várias vezes
    this.boss.phase1Triggered = false;
    this.boss.phase2Triggered = false;

    this.boss.play('boss_idle');
    this.tweens.add({
      targets: this.boss,
      x: this.config.width - 200,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.startBossRoutine();
      }
    });

    this.physics.add.overlap(this.projectiles, this.boss, this.hitBoss, null, this);
    this.physics.add.overlap(this.player, this.boss, this.playerHit, null, this);
  }

  // O Boss tenta usar o Ataque 1 a cada 3 segundos, SE não estiver ocupado
  startBossRoutine() {
    this.bossAttackTimer = this.time.addEvent({
      delay: 3000,
      callback: () => {
        if (this.boss.active && !this.boss.isAttacking) {
          this.bossAttack1();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  // --- ATAQUE 1: BOLA DE FOGO
  bossAttack1() {
    this.boss.isAttacking = true;
    this.boss.play('boss_atk1'); 

    // sincronia com animação e solta o fogo
    this.time.delayedCall(500, () => {
      if (!this.boss.active) return;

      // Cria o projétil
      const fireball = this.enemyProjectiles.create(this.boss.x - 50, this.boss.y, 'enemy_fireball');
      if (fireball) {
        fireball.setScale(0.15);

        fireball.play('anim_enemy_fireball');
        fireball.body.setAllowGravity(false);

        // Mira no jogador
        this.physics.moveToObject(fireball, this.player, 350);
        fireball.rotation = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);

        // Destrói após 3s
        this.time.delayedCall(3000, () => { if (fireball.active) fireball.destroy(); });
      }
    });

    // Volta para Idle quando acabar a animação de ataque
    this.boss.once('animationcomplete', () => {
      if (this.boss.active) {
        this.boss.play('boss_idle');
        this.boss.isAttacking = false;
      }
    });
  }

  // --- ATAQUE 2: CHUVA DE METEOROS
  bossAttack2() {
    this.boss.isAttacking = true;
    this.boss.play('boss_atk2'); 

    //  Loop vai de 0 até 4 meteoros
    for (let i = 0; i < 4; i++) {

      this.time.delayedCall(i * 400, () => {
        const randomX = Phaser.Math.Between(50, this.config.width - 50);
        const meteor = this.enemyProjectiles.create(randomX, -150, 'enemy_meteor');

        if (meteor) {
          meteor.setScale(0.3);
          meteor.play('anim_enemy_meteor');
          meteor.body.setAllowGravity(false);
          meteor.setVelocityY(500);

          // Rotação para ficar de bico pra baixo
          meteor.angle = -45;

          // Destrói depois de 2 segundos
          this.time.delayedCall(2000, () => { if (meteor.active) meteor.destroy(); });
        }
      });
    }

    // Volta para Idle quando acabar a animação do Boss
    this.boss.once('animationcomplete', () => {
      if (this.boss.active) {
        this.boss.play('boss_idle');
        this.boss.isAttacking = false;
      }
    });
  }

  // --- RECEBER DANO E GATILHOS DE FASE ---
  hitBoss(obj1, obj2) {
    let boss, projectile;
    if (obj1.texture.key === 'boss') { boss = obj1; projectile = obj2; }
    else { boss = obj2; projectile = obj1; }

    if (projectile.active) projectile.disableBody(true, true);

    // TRAVA DE MORTE
    if (boss.isDead) return;

    if (typeof boss.health === 'undefined') boss.health = 20;

    boss.health -= 1;
    boss.setTint(0xff0000);
    this.time.delayedCall(100, () => { if (boss.active) boss.clearTint(); });

    // FASES DO BOSS
    if (boss.health <= 10 && !boss.phase1Triggered) {
      boss.phase1Triggered = true;
      this.bossAttack2();
    }
    else if (boss.health <= 5 && !boss.phase2Triggered) {
      boss.phase2Triggered = true;
      this.bossAttack2();
    }

    // MORTE RÁPIDA
    if (boss.health <= 0) {
      boss.isDead = true;
      if (this.bossAttackTimer) this.bossAttackTimer.remove();

      boss.setVelocity(0);
      boss.body.checkCollision.none = true;

      boss.play('boss_die');

      this.time.delayedCall(500, () => {
        boss.destroy();

        this.showVictory();
      });
    }
  }

  // ANIMAÇÕES DOS MORCEGOS
  registerEnemyAnimations() {
    // Voo 
    this.anims.create({
      key: 'bat_fly',
      frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    // Morte/Fumaça 
    this.anims.create({
      key: 'bat_die',
      frames: this.anims.generateFrameNumbers('bat', { start: 4, end: 5 }),
      frameRate: 10,
      repeat: 0
    });

  }


  createEnemyGroup() {
    this.enemies = this.physics.add.group();

    // Colisão: Tiro acerta Inimigo
    this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy, null, this);
  }

  spawnEnemy() {
    // Se já matou os morcegos necessários, não spawna mais
    if (this.mobsDefeated >= this.maxMobsBeforeBoss) return;

    // Posição: Fora da tela na direita, altura aleatória
    const x = this.config.width + 100;
    const y = Phaser.Math.Between(50, this.config.height - 100);

    // Cria o morcego
    const enemy = this.enemies.create(x, y, 'bat');

    if (enemy) {
      enemy.setScale(0.1);
      enemy.setDepth(10);

      // Física
      enemy.body.setAllowGravity(false);
      enemy.setVelocityX(-150); // Voa para a esquerda

      // Animação
      enemy.play('bat_fly');

      // Limpeza (Destruir se passar da esquerda da tela)
      enemy.checkWorldBounds = true;
      enemy.outOfBoundsKill = true;

      // Vida do Morcego
      enemy.health = 1;
    }
  }

  hitEnemy(projectile, enemy) {
    // Some com o tiro
    projectile.disableBody(true, true);

    // Se o inimigo JÁ ESTIVER morrendo (vida 0), ignora novos tiros para não bugar a animação
    if (enemy.health <= 0) return;

    // Tira vida do inimigo
    enemy.health -= 1;

    // Se ainda tem vida, só pisca vermelho
    if (enemy.health > 0) {
      enemy.setTint(0xff0000);
      this.time.delayedCall(100, () => enemy.clearTint());
    }
    // Se morreu...
    else {
      // Para o movimento do morcego
      enemy.setVelocity(0);

      // Desativa o corpo físico (para o player não bater na fumaça e levar dano)
      enemy.body.checkCollision.none = true;

      // Toca a animação de fumaça
      enemy.play('bat_die');

      // Conta a morte
      this.mobsDefeated++;

      if (this.mobsDefeated === this.maxMobsBeforeBoss) {

        // Espera 1 segundo depois de matar o último morcego e chama o Boss
        this.time.delayedCall(1000, () => {
          this.spawnBoss();
        }, [], this);
      }

      // Destrói o objeto após a animação terminar
      enemy.once('animationcomplete', () => {
        enemy.destroy();
      });
    }
  }

  playerHit(player, enemy) {
    // Se já estiver invulnerável, ignora
    if (this.isInvulnerable) return;

    // TRAVA O DANO IMEDIATAMENTE
    this.isInvulnerable = true;

    // Tira 1 de vida
    this.takeDamage(1);

    // Empurrão
    if (player.x < enemy.x) {
      player.setVelocityX(-200);
    } else {
      player.setVelocityX(200);
    }

    // Pisca o player (Feedback visual)
    this.tweens.add({
      targets: player,
      alpha: 0.5,
      duration: 100,
      repeat: 5,
      yoyo: true,
      onComplete: () => {
        player.setAlpha(1);
        // LIBERA O DANO DE NOVO APÓS PISCAR
        this.isInvulnerable = false;
      }
    });
  }

  createHealingHeartsGroup() {
    this.healingHearts = this.physics.add.group();

    // Colisão: Player pega o coração
    this.physics.add.overlap(this.player, this.healingHearts, this.collectHeart, null, this);
  }

  spawnHealingHeart() {
    // Se o jogo acabou ou player morreu, não dropa nada
    if (!this.player.active || (this.boss && this.boss.isDead)) return;

    // Posição X aleatória
    const x = Phaser.Math.Between(50, this.config.width - 50);

    // Cria o coração acima da tela
    const heart = this.healingHearts.create(x, -50, 'heart');

    if (heart) {
      // Ajuste de escala 
      heart.setScale(0.08);

      // Física: Cai verticalmente
      heart.body.setAllowGravity(false);
      heart.setVelocityY(150); // Velocidade de queda

      // Limpeza
      heart.checkWorldBounds = true;
      heart.outOfBoundsKill = true;
    }
  }

  collectHeart(player, heart) {
    // Some com o coração da tela
    heart.disableBody(true, true);

    // Chama a função de curar (que já atualiza o HUD)
    this.heal(1);

    // Efeito visual ao pegar (piscar verde)
    player.setTint(0x00ff00);
    this.time.delayedCall(200, () => player.clearTint());
  }

  showGameOver() {
    // Pausa o jogo
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.player.anims.stop();

    // Fundo Escuro 
    const { width, height } = this.config;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(90)
      .setScrollFactor(0);

    // Texto "DERROTA"
    this.add.text(width / 2, height / 2 - 100, 'DERROTA', {
      fontSize: '80px',
      fontFamily: 'Arial Black',
      color: '#ff0000',
      stroke: '#ffffff',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.createButton(width / 2, height / 2 + 50, 'Tentar Novamente', () => {
      this.scene.restart();
    });

    this.createButton(width / 2, height / 2 + 120, 'Menu', () => {
      this.scene.start('StartScene');
    });
  }

  showVictory() {
    // Pausa o jogo
    this.physics.pause();


    // Fundo Escuro 
    const { width, height } = this.config;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setDepth(90)
      .setScrollFactor(0);

    // Texto "VITÓRIA"
    this.add.text(width / 2, height / 2 - 150, 'VITÓRIA!', {
      fontSize: '80px',
      fontFamily: 'Arial Black',
      color: '#ffd700', 
      stroke: '#ffffff',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.add.text(width / 2, height / 2 - 80, 'Você resgatou a princesa!', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);



    // Player (Parado)
    this.add.sprite(width / 2 - 40, height / 2 + 20, 'player')
      .setFrame(0) // Frame parado
      .setScale(0.3) // Ajuste a escala
      .setDepth(100)
      .setScrollFactor(0);

    // Princesa (Ao lado)
    // Se você ainda não tem a imagem, vai ficar um quadrado verde, mas não trava o jogo
    this.add.image(width / 2 + 40, height / 2 + 20, 'princess')
      .setScale(0.3)
      .setDepth(100)
      .setScrollFactor(0);

    // Coraçãozinho entre eles <3
    this.add.image(width / 2, height / 2 - 20, 'heart')
      .setScale(0.05)
      .setDepth(101)
      .setScrollFactor(0);



    this.createButton(width / 2, height / 2 + 120, 'Jogar Novamente', () => {
      this.scene.restart();
    });

    this.createButton(width / 2, height / 2 + 190, 'Menu', () => {
      this.scene.start('StartScene');
    });
  }

  createButton(x, y, text, onClick) {
    const button = this.add.text(x, y, text, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#000000'
    })
      .setOrigin(0.5)
      .setPadding(10)
      .setDepth(100)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    // Efeito Hover (Mouse em cima)
    button.on('pointerover', () => {
      button.setStyle({ fill: '#ffff00', backgroundColor: '#333333' });
    });

    // Efeito Out (Mouse sai)
    button.on('pointerout', () => {
      button.setStyle({ fill: '#ffffff', backgroundColor: '#000000' });
    });

    // Clique
    button.on('pointerdown', onClick);
  }

}
