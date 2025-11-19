// -----------------------------------------------------------------------------
// GameScene.js: define a cena principal do jogo
// -----------------------------------------------------------------------------

import Phaser from 'phaser';

// -----------------------------------------------------------------------------

// Classe que representa a cena principal do jogo
export default class GameScene extends Phaser.Scene {

  constructor(config) {
    // Define a chave da cena e armazena as configurações compartilhadas
    super({ key: 'GameScene' }, config);
    this.config = config;
  }

  // ---------------------------------------------------------------------------

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
    this.maxMobsBeforeBoss = 5; // Meta

    this.clouds = null;

    this.playerMaxHealth = 5;
    this.playerHealth = this.playerMaxHealth;
    this.hearts = [];

  }

  // ---------------------------------------------------------------------------

  // Cria os elementos visuais e lógicos da cena
  create() {

    // Cria o cenário de fundo e o chão
    this.createBackground();

    // Registra as animações do player e do inimigo
    this.registerPlayerAnimations();
    this.registerProjectileAnimations();
    this.registerEnemyAnimations();
    this.registerBossAnimations();
    this.enemyProjectiles = this.physics.add.group();

    this.createProjectilesGroup();
    this.createEnemyGroup();



    // Cria o player e o inimigo
    this.createPlayer();

    this.createHealthHUD();


    // Configura as propriedades físicas do player
    this.player.setCollideWorldBounds(true);

    // Configura entrada de teclado e mouse
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.input.mouse.disableContextMenu();

    this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
      projectile.destroy(); // Destrói a bola de fogo
      this.playerHit(player, projectile); // Dá dano no player
    }, null, this);

    this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);

    // Registra o evento para quando a animação de ataque terminar
    this.player.on('animationcomplete-player_attack', this.onPlayerAttackComplete, this);

    this.player.on('animationupdate', this.onPlayerAttackFrame, this);

    // --- TIMER PARA CRIAR MORCEGOS ---
    this.time.addEvent({
      delay: 2000, // A cada 2 segundos
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

  }

  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Funções auxiliares
  // ---------------------------------------------------------------------------

  // Método para criar o cenário de fundo
  createBackground() {
    // 1. Fundo Fixo
    this.add.image(this.config.width / 2, this.config.height / 2, 'bg1')
      .setScrollFactor(0)
      .setDisplaySize(this.config.width, this.config.height);

    // 2. Lua (Canto superior direito)
    this.add.image(this.config.width - 100, 100, 'moon')
      .setScale(0.5)
      .setScrollFactor(0);

    // 3. Grupo de Nuvens (Com Física para se moverem)
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

    // Pega uma nuvem do grupo (reaproveitamento) ou cria nova
    let cloud = this.clouds.get(startX, startY, cloudKey);

    if (cloud) {
      cloud.setActive(true);
      cloud.setVisible(true);
      cloud.setTexture(cloudKey);

      cloud.setDepth(0);

      // Estilo
      const scale = Phaser.Math.FloatBetween(0.5, 1.0);
      cloud.setScale(scale);
      cloud.setAlpha(0.9);

      // Física: Move para a esquerda
      // Nuvens menores (mais longe) se movem mais devagar -> Efeito 3D
      const speed = 50 * scale;
      cloud.body.setVelocityX(-speed);
      cloud.body.setAllowGravity(false); // Nuvem não cai
    }
  }


  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------

  // Método para criar o player
  createPlayer() {

    // Adiciona o primeiro sprite do player
    this.player = this.physics.add.sprite(
      200,
      this.config.height * 0.5,
      'player'
    ).setScale(0.25);


    // Executa a animação do player parado
    this.player.play('player_idle', true);

    this.player.setDepth(10);

  }

  // ---------------------------------------------------------------------------

  // Registra as animações do player
  registerPlayerAnimations() {
    // Frames 0 - 3: IDLE (Parado/Voo)
    // Frames 4 - 7: ATTACK (Disparo)

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
      frameRate: 15, // Velocidade da animação (10 quadros por segundo)
      repeat: -1 // Repetição infinita
    });
  }

  // Método chamado ao final da animação de ataque
  onPlayerAttackComplete(animation, frame) {
    if (animation.key === 'player_attack') {
      // Volta para a animação de idle ou walk após o ataque
      this.player.play('player_idle', true);
    }
  }

  onPlayerAttackFrame(animation, frame) {
    // Verifica se é a animação 'player_attack'
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
      // O defaultKey deve ser o spritesheet
      defaultKey: 'fireball',
      runChildUpdate: true
    });
  }

  // Lógica de disparo
  shootProjectile() {
    // Pega um projétil do grupo (ou cria se não tiver)
    // Nota: passamos x e y aqui, mas o enableBody garante o reset
    const projectile = this.projectiles.get(this.player.body.center.x, this.player.body.center.y);

    if (projectile) {
      projectile.enableBody(true, this.player.body.center.x, this.player.body.center.y, true, true);

      // Garante que a gravidade continue desligada (as vezes o reset liga de volta)
      projectile.body.setAllowGravity(false);

      projectile.setFrame(0);
      projectile.setScale(0.15);
      projectile.play('fire_loop', true);

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


  // Cria o HUD de vida (Corações)
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
        .setDepth(10)      // Garante que fique por cima
        .setScale(0.05);    // Ajuste o tamanho
      this.hearts.push(heart);
    }
  }

  // Função para atualizar o visual do HUD
  updateHealthHUD() {
    for (let i = 0; i < this.playerMaxHealth; i++) {
      // Se o índice for menor que a vida atual, mostra o coração
      // Caso contrário, esconde/muda para um coração vazio (se tiver o asset)
      this.hearts[i].setVisible(i < this.playerHealth);
    }
  }

  takeDamage(amount) {
    // Se já morreu, não faz nada
    if (this.playerHealth <= 0) return;

    this.playerHealth -= amount;

    // Atualiza o visual dos corações
    // (Esconde os corações baseados na vida atual)
    for (let i = 0; i < this.hearts.length; i++) {
      if (i < this.playerHealth) {
        this.hearts[i].setVisible(true);
      } else {
        this.hearts[i].setVisible(false);
      }
    }

    if (this.playerHealth <= 0) {
      console.log('Game Over!');
      // Pausa a física e pinta o jogador de vermelho escuro
      this.physics.pause();
      this.player.setTint(0xff0000);
      // Aqui virá o game over
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


  // ---------------------------------------------------------------------------

  // Método que controla o ataque do inimigo
  handleEnemyAttack() {

    // Indica se o inimigo está atacando o player
    // TODO

    // Obtém a distância entre o inimigo e o player
    // TODO

    // Se o inimigo estiver perto do player
    if (distanceToPlayer < this.distanceToAttack) {

      // Executa a animação de ataque
      // TODO

      // Enquanto ataca, não deixa o inimigo se movimentar
      // TODO

    }
    else {
      // Movimenta o inimigo
      // TODO
    }

  }

  // ---------------------------------------------------------------------------

  registerBossAnimations() {
    // Animação dele parado/voando (Idle)
    this.anims.create({
      key: 'boss_idle',
      frames: this.anims.generateFrameNumbers('boss', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

  }

  spawnBoss() {
    // Posiciona o Boss entrando pela direita
    const x = this.config.width + 150;
    const y = this.config.height / 2; // No meio da altura

    // Cria o sprite (usando a chave 'boss' do Preload)
    this.boss = this.physics.add.sprite(x, y, 'boss');

    this.boss.setScale(0.25);
    this.boss.setDepth(10);

    // Física
    this.boss.body.setAllowGravity(false);
    this.boss.setImmovable(true);

    // Animação Inicial
    this.boss.play('boss_idle');

    this.boss.health = 20;

    // Movimento de Entrada (Entra na tela e para)
    this.tweens.add({
      targets: this.boss,
      x: this.config.width - 150,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        // O Boss só começa a atacar depois que entra na tela
        this.startBossAttacks();
      }
    });

    // --- COLISÕES DO BOSS ---
    // Tiro acerta Boss
    this.physics.add.overlap(this.projectiles, this.boss, this.hitBoss, null, this);

    // Player bate no Boss
    this.physics.add.overlap(this.player, this.boss, this.playerHit, null, this);
  }

  hitBoss(projectile, boss) {
    projectile.disableBody(true, true);

    console.log("antes do tiro",boss.health);

    boss.health -= 1;

    console.log("antes do tiro",boss.health);

    boss.setTint(0xff0000);
    this.time.delayedCall(100, () => boss.clearTint());

    console.log(`Vida do Boss: ${boss.health}`);

    if (boss.health <= 0) {
      // Para tudo
      boss.setVelocity(0);
      // Toca animação de morte 
      this.tweens.add({
        targets: boss,
        angle: 360,
        scale: 0,
        duration: 1000,
        onComplete: () => {
          boss.destroy();
          console.log("PARABÉNS! VOCÊ SALVOU A PRINCESA !");
          // Aqui virá a tela de vitoria
        }
      });
    }
  }

  startBossAttacks() {
    // Cria um timer que repete indefinidamente
    this.bossAttackTimer = this.time.addEvent({
      delay: 2000, // Boss ataca a cada 2 segundos
      callback: this.bossAttack1,
      callbackScope: this,
      loop: true
    });
  }

  bossAttack1() {
    // Se o boss ou player morreram, para de atacar
    if (!this.boss.active || !this.player.active) return;

    // Cria o projétil na posição do Boss
    const projectile = this.enemyProjectiles.create(this.boss.x - 50, this.boss.y, 'enemy_fireball');

    if (projectile) {
      projectile.setScale(1); 
      projectile.body.setAllowGravity(false);

      // FÍSICA: Atira na direção onde o player está AGORA
      this.physics.moveToObject(projectile, this.player, 400); 

      // Gira o projétil para olhar para o player
      projectile.rotation = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);

      // Destrói depois de 3 segundos pra não pesar o jogo
      this.time.delayedCall(3000, () => {
        if (projectile.active) projectile.destroy();
      });
    }
  }

  registerEnemyAnimations() {
    // Voo (Frames 0 a 3)
    this.anims.create({
      key: 'bat_fly',
      frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    // Morte/Fumaça (Frames 5 a 6)
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
      // 1. Para o movimento do morcego
      enemy.setVelocity(0);

      // 2. Desativa o corpo físico (para o player não bater na fumaça e levar dano)
      enemy.body.checkCollision.none = true;

      // 3. Toca a animação de fumaça
      enemy.play('bat_die');

      // 4. Lógica do Jogo (Contar a morte)
      this.mobsDefeated++;
      console.log(`Morcegos derrotados: ${this.mobsDefeated}`);

      if (this.mobsDefeated === this.maxMobsBeforeBoss) {
        console.log("O BOSS ESTÁ VINDO!");

        // Espera 1 segundinho depois de matar o último morcego e chama o Boss
        this.time.delayedCall(1000, () => {
          this.spawnBoss();
        }, [], this);
      }

      // 5. Destrói o objeto APÓS a animação terminar
      enemy.once('animationcomplete', () => {
        enemy.destroy();
      });
    }
  }

  playerHit(player, enemy) {
    // Se o player não estiver invisível/piscando (invulnerável)
    if (player.alpha === 1) {

      // Tira 1 de vida
      this.takeDamage(1);

      // Empurrãozinho para trás (Feedback de impacto)
      if (player.x < enemy.x) {
        player.setVelocityX(-200);
      } else {
        player.setVelocityX(200);
      }

      // Invulnerabilidade temporária (pisca)
      this.tweens.add({
        targets: player,
        alpha: 0.5, // Fica meio transparente
        duration: 100,
        repeat: 5, // Pisca 5 vezes
        yoyo: true,
        onComplete: () => {
          player.setAlpha(1); // Volta ao normal
          player.setVelocity(0); // Para o empurrão
        }
      });
    }
  }

}
