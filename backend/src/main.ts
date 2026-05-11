import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as process from 'node:process';
import 'reflect-metadata';
import { appConfig } from '@/config/configLoader';
import { ShutdownManager } from '@/modules/ShutdownModule/ShutdownManager';

async function bootstrap() {
    const isDev = process.env.NODE_ENV === 'development';
    const logLevel = isDev ? ['log', 'error', 'warn', 'debug'] : ['log', 'error', 'warn'];
    console.log('Using log level:', logLevel);

    const app = await NestFactory.create(AppModule, {
        logger: logLevel as any,
    });
    const configuration = app.get(appConfig.KEY);
    const configuredPort = configuration.configurations.app.port;
    const corsOrigin = [`http://127.0.0.1:${configuredPort}`, `http://localhost:${configuredPort}`, ...configuration.configurations.app['additional-cors-origins']];
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
        prefix: 'api/v',
    });
    app.enableShutdownHooks();
    app.useWebSocketAdapter(new WsAdapter(app));
    app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.enableCors({ origin: isDev ? '*' : corsOrigin });

    const shutdownService = app.get(ShutdownManager);
    shutdownService.setApp(app);

    const config = new DocumentBuilder()
        .setTitle('Valorant Replay Viewer')
        .setDescription('')
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    await app.listen(configuredPort);
}

bootstrap();
